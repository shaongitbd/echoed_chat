# Echoed.chat: A Unified AI Chat Experience

Echoed.chat is an open-source, feature-rich chat application. It aims to provide a comprehensive and seamless conversational AI experience.

## ✨ Features

- **Authentication & DB Sync:** Secure user authentication and real-time database synchronization with Appwrite.
- **Text Chat:** Real-time text-based conversations.
- **Image Generation:** Generate images directly within the chat.
- **Branching Conversations:** Explore different conversational paths by branching from any message.
- **Chat Export/Import:** Easily export and import your chat history.
- **Shareable Chats:** Share your conversations with others via a public link.
- **User Limit Checker:** Manage and monitor user-based limitations.

### 🚧 Work in Progress

- **Video Generation:** Upcoming feature for generating videos.
- **Web Search:** Integrated web search capabilities.

## 🛠️ Tech Stack

| Category      | Technology                                    |
|---------------|-----------------------------------------------|
| **Frontend**  | [React](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/) |
| **Backend**   | [Express.js](https://expressjs.com/)          |
| **BaaS**      | [Appwrite](https://appwrite.io/) (Auth, Database, Storage) |

## 🚀 Getting Started

Follow these steps to set up and run Echoed.chat on your local machine.

### Prerequisites

- Node.js
- npm
- An Appwrite project

### 1. Appwrite Setup

Before running the application, you need to set up your Appwrite project.

1.  Create a new project on your Appwrite instance.
2.  Set up the required collections and storage buckets. See our [Appwrite Schema Setup Guide](docs/appwrite-schema.md) for details.

### 2. Environment Configuration

You'll need to create `.env` files for both the frontend and backend.

#### Frontend (`frontend/.env`)

Create a `.env` file in the `frontend` directory with the following variables:

```
REACT_APP_APPWRITE_ENDPOINT=
REACT_APP_APPWRITE_PROJECT_ID=
REACT_APP_APPWRITE_DATABASE_ID=
REACT_APP_APPWRITE_USERS_COLLECTION_ID=
REACT_APP_APPWRITE_THREADS_COLLECTION_ID=
REACT_APP_APPWRITE_MESSAGES_COLLECTION_ID=
REACT_APP_APPWRITE_USER_SETTINGS_COLLECTION_ID=

REACT_APP_SEARCH_API_ENDPOINT=
REACT_APP_APPWRITE_ATTACHMENTS_BUCKET_ID=
REACT_APP_BACKEND_URL=
PRICING_COLLECTION_ID=
REACT_APP_APPWRITE_PRICING_COLLECTION_ID=

#### Backend (`backend/.env`)

Create a `.env` file in your backend directory with the following variables:

```
APPWRITE_ENDPOINT=
APPWRITE_PROJECT_ID=
APPWRITE_API_KEY=
APPWRITE_DATABASE_ID=
APPWRITE_PROFILES_COLLECTION_ID=
APPWRITE_USERS_COLLECTION_ID=
APPWRITE_PRICING_COLLECTION_ID=
APPWRITE_CHAT_MESSAGES_COLLECTION_ID=
APPWRITE_CHAT_THREADS_COLLECTION_ID=
```

### 3. Installation & Running the App

#### Frontend

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

#### Backend

```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install

# Start the server
npm start
```

## 🤝 Contributing

Contributions are welcome! If you'd like to contribute to Echoed.chat, please fork the repository and create a pull request. For major changes, please open an issue first to discuss what you would like to change.

## 📝 License

This project is licensed under the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](https://creativecommons.org/licenses/by-nc-sa/4.0/). See the `LICENSE` file for details.