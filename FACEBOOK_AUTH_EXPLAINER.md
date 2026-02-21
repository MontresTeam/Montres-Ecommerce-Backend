# Facebook OAuth Implementation Guide

## Backend Updates
I have updated the backend to securely handle Facebook Login. 

1. **`controllers/userController.js`**: `facebookSignup` function now accepts an `accessToken` from the frontend, verifies it with Facebook's Graph API, and then finds or creates the user. This is much more secure than sending raw profile data.
2. **`models/UserModel.js`**: Updated to support `facebookId` and allow users to exist without a password if they signed up via Facebook.
3. **`.env`**: Added your Facebook App ID and Secret (used for verification if needed, although the current implementation primarily uses the Graph API with the user access token).

## Frontend Implementation Steps

To complete the integration, your frontend (Next.js) needs to perform the following steps:

### 1. Install a Facebook Login Library
You can use `react-facebook-login` which makes it very easy.

```bash
npm install react-facebook-login
```

### 2. Add the Facebook Login Button
In your Login or Register page component:

```jsx
import FacebookLogin from 'react-facebook-login/dist/facebook-login-render-props';
import axios from 'axios';
import { useRouter } from 'next/router'; // or 'next/navigation' for App Router

const FacebookAuth = () => {
  const router = useRouter();

  const responseFacebook = async (response) => {
    try {
      if (response.accessToken) {
        // Send the access token to your backend
        const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/Auth/facebook-signup`, {
          accessToken: response.accessToken,
          userID: response.userID // Optional, backend gets it from token
        });

        if (res.status === 200) {
          // Save JWT token
          localStorage.setItem('accessToken', res.data.accessToken);
          // Redirect user
          router.push('/dashboard');
        }
      }
    } catch (error) {
      console.error("Facebook Login Error:", error);
      alert("Login failed. Please try again.");
    }
  };

  return (
    <FacebookLogin
      appId="897973792812961" // Your App ID
      autoLoad={false}
      fields="name,email,picture"
      callback={responseFacebook}
      render={renderProps => (
        <button onClick={renderProps.onClick} className="btn-facebook">
           Sign in with Facebook
        </button>
      )}
    />
  );
};

export default FacebookAuth;
```

### 3. API Endpoint
The backend endpoint is:
`POST /api/Auth/facebook-signup`

**Request Body:**
```json
{
  "accessToken": "EAA..."
}
```

**Response:**
```json
{
  "message": "Facebook login/signup successful",
  "accessToken": "ey...",
  "user": { ... }
}
```

This ensures a secure and proper implementation as requested.
