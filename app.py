import hashlib
import os
import secrets
import smtplib
from datetime import datetime, timedelta
from email.message import EmailMessage

from dotenv import load_dotenv
from flask import (
    Flask,
    render_template,
    request,
    jsonify,
    session,
    redirect,
    url_for,
    send_from_directory
)
from werkzeug.security import generate_password_hash, check_password_hash
from AI.analyzer import analyze_feedback
from database import get_connection

REACT_BUILD = os.path.join(os.path.dirname(__file__), "frontend", "dist")
app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", secrets.token_hex(32))
load_dotenv()


def react_index():
    if os.path.exists(os.path.join(REACT_BUILD, "index.html")):
        return send_from_directory(REACT_BUILD, "index.html")
    return render_template("index.html")


@app.route("/assets/<path:filename>")
def react_assets(filename):
    return send_from_directory(os.path.join(REACT_BUILD, "assets"), filename)


def send_password_reset_email(recipient, reset_url):
    message = EmailMessage()
    message["Subject"] = "Reset your Smart Feedback AI password"
    message["From"] = os.environ["MAIL_FROM"]
    message["To"] = recipient
    message.set_content(
        "Use the following link to reset your password. "
        "The link expires in 30 minutes and can only be used once:\n\n"
        + reset_url
    )

    with smtplib.SMTP(
        os.environ["MAIL_HOST"],
        int(os.environ.get("MAIL_PORT", "587"))
    ) as smtp:
        smtp.starttls()
        smtp.login(os.environ["MAIL_USERNAME"], os.environ["MAIL_PASSWORD"])
        smtp.send_message(message)


@app.route("/login")
def login():
    return react_index()


@app.route("/forgot-password")
def forgot_password():
    return react_index()


@app.route("/reset-password/<token>")
def reset_password(token):
    return react_index()


@app.route("/api/forgot-password", methods=["POST"])
def request_password_reset():
    data = request.get_json() or {}
    email = data.get("email", "").strip()
    response = {
        "success": True,
        "message": "If an account exists for that email, a reset link has been sent."
    }

    if not email:
        return jsonify(response)

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT id, email FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        if user:
            token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            expires_at = datetime.utcnow() + timedelta(minutes=30)

            cursor.execute(
                """
                UPDATE password_reset_tokens
                SET used_at = NOW()
                WHERE user_id = %s AND used_at IS NULL
                """,
                (user["id"],)
            )
            cursor.execute(
                """
                INSERT INTO password_reset_tokens
                    (user_id, token_hash, expires_at)
                VALUES (%s, %s, %s)
                """,
                (user["id"], token_hash, expires_at)
            )
            connection.commit()
            reset_url = url_for("reset_password", token=token, _external=True)
            send_password_reset_email(user["email"], reset_url)

        cursor.close()
        connection.close()
        return jsonify(response)
    except Exception as error:
        print("Password reset request error:", error)
        return jsonify({
            "success": False,
            "message": "Unable to send the reset email. Please try again later."
        }), 500


@app.route("/api/reset-password", methods=["POST"])
def update_password():
    data = request.get_json() or {}
    token = data.get("token", "")
    password = data.get("password", "")

    if len(password) < 6:
        return jsonify({
            "success": False,
            "message": "Password must be at least 6 characters."
        }), 400

    token_hash = hashlib.sha256(token.encode()).hexdigest()
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT id, user_id
        FROM password_reset_tokens
        WHERE token_hash = %s
          AND used_at IS NULL
          AND expires_at > NOW()
        """,
        (token_hash,)
    )
    reset_token = cursor.fetchone()

    if not reset_token:
        cursor.close()
        connection.close()
        return jsonify({
            "success": False,
            "message": "This reset link is invalid or has expired."
        }), 400

    cursor.execute(
        "UPDATE users SET password = %s WHERE id = %s",
        (generate_password_hash(password), reset_token["user_id"])
    )
    cursor.execute(
        "UPDATE password_reset_tokens SET used_at = NOW() WHERE id = %s",
        (reset_token["id"],)
    )
    connection.commit()
    cursor.close()
    connection.close()

    return jsonify({
        "success": True,
        "message": "Password reset successfully."
    })

@app.route("/api/login", methods=["POST"])
def login_user():

    try:
        data = request.get_json()

        email = data.get("email", "").strip()
        password = data.get("password", "")

        if not email or not password:
            return jsonify({
                "success": False,
                "message": "Email and password are required."
            }), 400

        from database import get_connection

        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id, name, email, password, role
            FROM users
            WHERE email = %s
            """,
            (email,)
        )

        user = cursor.fetchone()

        cursor.close()
        connection.close()

        if not user:
            return jsonify({
                "success": False,
                "message": "Invalid email or password."
            }), 401

        if not check_password_hash(user["password"], password):
            return jsonify({
                "success": False,
                "message": "Invalid email or password."
            }), 401

        # Store user information in session
        session["user_id"] = user["id"]
        session["name"] = user["name"]
        session["role"] = user["role"]

        return jsonify({
            "success": True,
            "message": "Login successful!",
            "role": user["role"]
        }), 200

    except Exception as e:

        print("Login error:", e)

        return jsonify({
            "success": False,
            "message": "Login failed."
        }), 500

@app.route("/dashboard")
def dashboard():

    if "user_id" not in session:
        return redirect("/login")

    return react_index()
@app.route("/api/my-feedback")
def my_feedback():

    if "user_id" not in session:
        return jsonify({
            "success": False,
            "message": "Please login first"
        }), 401

    connection = get_connection()

    cursor = connection.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            id,
            feedback_text,
            sentiment,
            category,
            priority,
            status,
            created_at
        FROM feedback
        WHERE user_id = %s
        ORDER BY created_at DESC
    """, (session["user_id"],))

    feedback = cursor.fetchall()

    cursor.close()
    connection.close()

    return jsonify({
        "success": True,
        "feedback": feedback
    })
    
@app.route("/logout")
def logout():

    session.clear()

    return react_index()

@app.route("/admin")
def admin():

    if "user_id" not in session:
        return render_template("login.html")

    if session.get("role") != "admin":
        return "Access denied", 403

    return react_index()

@app.route("/api/admin/feedback")
def get_feedback():

    if "user_id" not in session:
        return jsonify({
            "success": False,
            "message": "Login required."
        }), 401

    if session.get("role") != "admin":
        return jsonify({
            "success": False,
            "message": "Access denied."
        }), 403

    try:
        from database import get_connection

        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        search = request.args.get("search", "")
        status = request.args.get("status", "")
        sentiment = request.args.get("sentiment", "")
        category = request.args.get("category", "")
        priority = request.args.get("priority", "")

        query = """
            SELECT
                id,
                feedback_text,
                sentiment,
                category,
                priority,
                status,
                created_at
            FROM feedback
            WHERE 1=1
        """

        params = []

        if search:

            query += """
                AND feedback_text LIKE %s
            """

            params.append("%" + search + "%")


        if status:

            query += """
                AND status = %s
            """

            params.append(status)


        if sentiment:

            query += """
                AND sentiment = %s
            """

            params.append(sentiment)


        if category:

            query += """
                AND category = %s
            """

            params.append(category)


        if priority:

            query += """
                AND priority = %s
            """

            params.append(priority)


        query += """
            ORDER BY created_at DESC
        """

        cursor.execute(query, params)

        feedback = cursor.fetchall()
        cursor.close()
        connection.close()

        return jsonify({
            "success": True,
            "feedback": feedback
        })

    except Exception as e:

        print("Feedback error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to load feedback."
        }), 500

@app.route("/api/admin/stats")
def admin_stats():

    if "user_id" not in session:
        return jsonify({
            "success": False,
            "message": "Login required."
        }), 401

    if session.get("role") != "admin":
        return jsonify({
            "success": False,
            "message": "Access denied."
        }), 403

    try:
        from database import get_connection

        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                COUNT(*) AS total,
                SUM(status = 'pending') AS pending,
                SUM(status = 'reviewed') AS reviewed,
                SUM(status = 'flagged') AS flagged
            FROM feedback
        """)

        stats = cursor.fetchone()

        cursor.close()
        connection.close()

        return jsonify({
            "success": True,
            "stats": stats
        })

    except Exception as e:

        print("Stats error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to load statistics."
        }), 500
        
@app.route("/api/admin/analytics")
def admin_analytics():

    if session.get("role") != "admin":
        return jsonify({
            "success": False,
            "message": "Access denied"
        }), 403

    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    # Sentiment
    cursor.execute("""
        SELECT sentiment, COUNT(*) AS count
        FROM feedback
        WHERE sentiment IS NOT NULL
        GROUP BY sentiment
    """)

    sentiment_rows = cursor.fetchall()

    # Category
    cursor.execute("""
        SELECT category, COUNT(*) AS count
        FROM feedback
        WHERE category IS NOT NULL
        GROUP BY category
    """)

    category_rows = cursor.fetchall()

    # Priority
    cursor.execute("""
        SELECT priority, COUNT(*) AS count
        FROM feedback
        WHERE priority IS NOT NULL
        GROUP BY priority
    """)

    priority_rows = cursor.fetchall()

    cursor.close()
    connection.close()

    return jsonify({
        "success": True,
        "sentiment": sentiment_rows,
        "category": category_rows,
        "priority": priority_rows
    })
    
@app.route("/api/admin/feedback/<int:feedback_id>/flag", methods=["PUT"])
def flag_feedback(feedback_id):

    if "user_id" not in session:
        return jsonify({
            "success": False,
            "message": "Login required."
        }), 401

    if session.get("role") != "admin":
        return jsonify({
            "success": False,
            "message": "Access denied."
        }), 403

    try:
        from database import get_connection

        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute("""
            UPDATE feedback
            SET status = 'flagged'
            WHERE id = %s
        """, (feedback_id,))

        connection.commit()

        cursor.close()
        connection.close()

        return jsonify({
            "success": True,
            "message": "Feedback flagged."
        })

    except Exception as e:

        print("Flag error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to flag feedback."
        }), 500
        
@app.route("/api/admin/feedback/<int:feedback_id>/review", methods=["PUT"])
def review_feedback(feedback_id):

    if "user_id" not in session:
        return jsonify({
            "success": False,
            "message": "Login required."
        }), 401

    if session.get("role") != "admin":
        return jsonify({
            "success": False,
            "message": "Access denied."
        }), 403

    try:

        from database import get_connection

        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute("""
            UPDATE feedback
            SET status = 'reviewed'
            WHERE id = %s
        """, (feedback_id,))

        connection.commit()

        cursor.close()
        connection.close()

        return jsonify({
            "success": True,
            "message": "Feedback marked as reviewed."
        })

    except Exception as e:

        print("Review error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to update feedback."
        }), 500


@app.route("/")
def home():
    return react_index()


@app.route("/feedback")
def feedback():
    return react_index()

@app.route("/api/feedback", methods=["POST"])
def submit_feedback():

    try:

        # User must be logged in
        if "user_id" not in session:
            return jsonify({
                "success": False,
                "message": "Please login before submitting feedback."
            }), 401

        data = request.get_json()

        feedback_text = data.get("feedback_text", "").strip()

        # Backend validation
        if not feedback_text:
            return jsonify({
                "success": False,
                "message": "Feedback cannot be empty."
            }), 400

        if len(feedback_text) < 5:
            return jsonify({
                "success": False,
                "message": "Feedback must contain at least 5 characters."
            }), 400

        # AI analysis
        analysis = analyze_feedback(feedback_text)

        sentiment = analysis["sentiment"]
        category = analysis["category"]
        priority = analysis["priority"]

        # Logged-in user's ID
        user_id = session["user_id"]

        # Connect to database
        connection = get_connection()
        cursor = connection.cursor()

        # Insert feedback with user_id
        query = """
            INSERT INTO feedback
            (
                user_id,
                feedback_text,
                sentiment,
                category,
                priority
            )
            VALUES (%s, %s, %s, %s, %s)
        """

        cursor.execute(
            query,
            (
                user_id,
                feedback_text,
                sentiment,
                category,
                priority
            )
        )

        connection.commit()

        cursor.close()
        connection.close()

        return jsonify({
            "success": True,
            "message": "Feedback submitted successfully!",
            "analysis": {
                "sentiment": sentiment,
                "category": category,
                "priority": priority
            }
        }), 201

    except Exception as e:

        print("Feedback submission error:", e)

        return jsonify({
            "success": False,
            "message": "Something went wrong while submitting feedback."
        }), 500
        
@app.route("/test-db")
def test_db():
    try:
        from database import get_connection

        connection = get_connection()

        if connection.is_connected():
            connection.close()
            return "Database connected successfully!"

    except Exception as e:
        return f"Database connection failed: {e}"

@app.route("/register")
def register():
    return react_index()


@app.route("/api/register", methods=["POST"])
def register_user():

    try:
        data = request.get_json()

        name = data.get("name", "").strip()
        email = data.get("email", "").strip()
        password = data.get("password", "")

        # Validation
        if not name or not email or not password:
            return jsonify({
                "success": False,
                "message": "All fields are required."
            }), 400

        if len(password) < 6:
            return jsonify({
                "success": False,
                "message": "Password must be at least 6 characters."
            }), 400

        from database import get_connection

        connection = get_connection()
        cursor = connection.cursor()

        # Check existing email
        cursor.execute(
            "SELECT id FROM users WHERE email = %s",
            (email,)
        )

        if cursor.fetchone():
            cursor.close()
            connection.close()

            return jsonify({
                "success": False,
                "message": "Email already registered."
            }), 409

        # Securely hash password
        hashed_password = generate_password_hash(password)

        cursor.execute(
            """
            INSERT INTO users (name, email, password)
            VALUES (%s, %s, %s)
            """,
            (name, email, hashed_password)
        )

        connection.commit()

        cursor.close()
        connection.close()

        return jsonify({
            "success": True,
            "message": "Registration successful!"
        }), 201

    except Exception as e:

        print("Registration error:", e)

        return jsonify({
            "success": False,
            "message": "Registration failed."
        }), 500


if __name__ == "__main__":
    app.run(debug=True)