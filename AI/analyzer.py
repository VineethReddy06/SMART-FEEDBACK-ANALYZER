def analyze_feedback(text):

    text = text.lower()

    positive_words = [
        "good", "great", "excellent", "amazing",
        "love", "helpful", "fast", "perfect",
        "satisfied", "happy"
    ]

    negative_words = [
        "bad", "poor", "terrible", "slow",
        "late", "worst", "hate", "problem",
        "issue", "disappointed"
    ]

    positive_score = sum(
        1 for word in positive_words if word in text
    )

    negative_score = sum(
        1 for word in negative_words if word in text
    )

    if positive_score > negative_score:
        sentiment = "Positive"
    elif negative_score > positive_score:
        sentiment = "Negative"
    else:
        sentiment = "Neutral"

    if any(word in text for word in [
        "delivery", "shipping", "late", "order"
    ]):
        category = "Delivery"

    elif any(word in text for word in [
        "product", "quality", "item"
    ]):
        category = "Product"

    elif any(word in text for word in [
        "support", "customer service", "response"
    ]):
        category = "Support"

    elif any(word in text for word in [
        "price", "cost", "expensive", "cheap"
    ]):
        category = "Pricing"

    else:
        category = "Other"

    if any(word in text for word in [
        "urgent", "critical", "fraud",
        "danger", "serious", "emergency"
    ]):
        priority = "High"

    elif any(word in text for word in [
        "problem", "issue", "complaint",
        "late", "slow"
    ]):
        priority = "Medium"

    else:
        priority = "Low"

    return {
        "sentiment": sentiment,
        "category": category,
        "priority": priority
    } 