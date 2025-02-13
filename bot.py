import requests

# Replace these with your details
ACCESS_TOKEN = "your_access_token"
PHONE_NUMBER_ID = "your_phone_number_id"

def send_message(to, message):
    url = f"https://graph.facebook.com/v16.0/{PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    data = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": message}
    }
    response = requests.post(url, headers=headers, json=data)
    return response.json()

if __name__ == "__main__":
    recipient = input("Enter recipient phone number (with country code): ")
    message = input("Enter your message: ")
    response = send_message(recipient, message)
    print("Response:", response)
