# Appwrite Schema for Echoed.chat

This document outlines the database schema used in the Appwrite backend for the Echoed.chat application.

## Collections

### 1. ChatThreads

Stores information about each conversation thread.

| Key                 | Type     | Required | Default Value | Notes                               |
| ------------------- | -------- | -------- | ------------- | ----------------------------------- |
| `title`             | String   | Yes      | -             | The title of the chat thread.       |
| `createdBy`         | String   | Yes      | -             | User ID of the creator.             |
| `isShared`          | Boolean  | No       | `false`       | Flag to indicate if the thread is shared. |
| `shareSettings`     | String   | Yes      | -             | JSON string for sharing settings.   |
| `lastMessageAt`     | Datetime | No       | -             | Timestamp of the last message.      |
| `defaultProvider`   | String   | Yes      | -             | Default AI provider for the thread. |
| `defaultModel`      | String   | Yes      | -             | Default AI model for the thread.    |
| `branchedFromThread`| String   | No       | -             | ID of the thread this was branched from. |
| `branchedFromMessage`| String  | No       | -             | ID of the message this was branched from. |
| `participants`      | String[] | No       | `[]`          | Array of user IDs participating.    |

---

### 2. Messages

Stores individual messages within each chat thread.

| Key               | Type     | Required | Default Value | Notes                               |
| ----------------- | -------- | -------- | ------------- | ----------------------------------- |
| `threadId`        | String   | Yes      | -             | The ID of the parent `ChatThreads`. |
| `sender`          | String   | Yes      | -             | User ID of the message sender.      |
| `content`         | String   | Yes      | -             | The text content of the message.    |
| `contentType`     | String   | Yes      | -             | Type of content (e.g., 'text', 'image'). |
| `model`           | String   | Yes      | -             | The AI model used for the response. |
| `provider`        | String   | Yes      | -             | The AI provider used.               |
| `parentMessageId` | String   | No       | -             | The ID of the parent message for branching. |
| `isEdited`        | Boolean  | No       | `false`       | Flag to indicate if the message was edited. |
| `searchMetadata`  | String   | No       | -             | Metadata for search indexing.       |
| `tokensUsed`      | Integer  | No       | `0`           | Number of tokens used for the AI response. |
| `contextLength`   | Integer  | No       | `0`           | Length of the context provided.     |
| `fileIds`         | String[] | No       | `[]`          | Array of associated file IDs.       |
| `attachments`     | String[] | No       | `[]`          | Array of attachment details (JSON string). |

---

### 3. Pricing

Stores details about different subscription packages.

| Key             | Type    | Required | Default Value | Notes                               |
| --------------- | ------- | -------- | ------------- | ----------------------------------- |
| `package_name`  | String  | Yes      | -             | The internal name of the package.   |
| `image_credit`  | Integer | Yes      | -             | Number of image generation credits. |
| `text_credit`   | Integer | Yes      | -             | Number of text query credits.       |
| `video_credit`  | Integer | Yes      | -             | Number of video generation credits. |
| `display_name`  | String  | No       | -             | The public-facing name of the package. |
| `price_display` | Integer | No       | `0`           | The price to display to the user.   |
| `description`   | String  | No       | -             | A description of the pricing plan.  |

---

### 4. Users

Stores user-specific information.

| Key          | Type   | Required | Default Value                                       | Notes                               |
| ------------ | ------ | -------- | --------------------------------------------------- | ----------------------------------- |
| `name`       | String | Yes      | -                                                   | The user's full name.               |
| `email`      | String | Yes      | -                                                   | The user's email address.           |
| `plan`       | String | Yes      | -                                                   | The user's current subscription plan. |
| `usageStats` | String | No       | `{"textQueries":0,"imageGeneration":0,"videoGeneration":0}` | JSON string tracking user's usage.  |
| `preferences`| String | No       | -                                                   | JSON string for user preferences.   |
