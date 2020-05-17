import axios from "axios";
import OktaSignIn from "@okta/okta-signin-widget";
import "@okta/okta-signin-widget/dist/css/okta-sign-in.min.css";
import "./site.css";

// make below 2 line in .env later
const oktaOrgUrl = "https://dev-520798.okta.com";
const oktaClientId = "0oacfx46b6bPPVD9v4x6";

// helper function to update the results text
const displayMessage = (msg) => {
  document.getElementById("results").innerHTML = msg;
};

// Displays a welcome message and enables the "Sign out" button
const updateProfile = (idToken) => {
  try {
    displayMessage(`Hello, ${idToken.claims.name} (${idToken.claims.email})`);
  } catch (err) {
    console.log(err);
    displayMessage(err.message);
  }
};

const registerButtonEvents = async (oktaSignIn) => {
  // "Test public API" button click event handler
  document
    .getElementById("publicButton")
    .addEventListener("click", async function () {
      try {
        displayMessage("");
        // Use axios to make a call to the public serverless function
        const res = await axios.get("/api/public-test");
        displayMessage(JSON.stringify(res.data));
      } catch (err) {
        console.log(err);
        displayMessage(err.message);
      }
    });

  // "Test secure API" button click event handler
  document
    .getElementById("secureButton")
    .addEventListener("click", async function () {
      displayMessage("");
      try {
        // get the current access token to make the request
        const accessToken = await oktaSignIn.authClient.tokenManager.get(
          "accessToken"
        );
        if (!accessToken) {
          displayMessage("You are not logged in");
          return;
        }
        // use axios to make a call to the secure serverless function,
        // passing the access token in the Authorization header
        const res = await axios.get("/api/secure-test", {
          headers: {
            Authorization: "Bearer " + accessToken.accessToken,
            SameSite:"None",
          },
        });
        // display the returned data
        displayMessage(JSON.stringify(res.data));
      } catch (err) {
        displayMessage(err.message);
      }
    });

  // "Sign out" button click event handler
  document
    .getElementById("signOut")
    .addEventListener("click", async function () {
      displayMessage("");

      // clear local stored tokens and sign out of Okta
      oktaSignIn.authClient.tokenManager.clear();
      oktaSignIn.authClient.signOut();

      // reload page
      window.location.reload();
    });
};

const runOktaLogin = async (oktaSignIn) => {
  try {
    // Check if there's an existing login session
    const session = await oktaSignIn.authClient.session.get();

    if (session.status === "ACTIVE") {
      // Show Sign Out button
      document.getElementById("signOut").style.visibility = "visible";

      // See if the idToken has already been added to the token manager
      const idToken = await oktaSignIn.authClient.tokenManager.get("idToken");

      if (!idToken) {
        // Immediately after redirect from signing into Okta,
        // the access and ID tokens have not yet been added to local storage
        const tokens = await oktaSignIn.authClient.token.parseFromUrl();
        for (const token of tokens) {
          if (token.idToken) {
            oktaSignIn.authClient.tokenManager.add("idToken", token);
            updateProfile(token);
          }
          if (token.accessToken) {
            oktaSignIn.authClient.tokenManager.add("accessToken", token);
          }
        }
      } else {
        // There's already a login session and tokens, so update the welcome message
        updateProfile(idToken);
      }
    } else {
      // User has not yet logged in, so show the login form
      oktaSignIn.showSignInToGetTokens({
        clientId: oktaClientId,
        redirectUri: window.location.origin,
        // Return an access token from the authorization server
        getAccessToken: true,
        // Return an ID token from the authorization server
        getIdToken: true,
        scope: "openid profile email",
      });
    }
  } catch (err) {
    console.log(err);
    displayMessage(err.message);
  }
};

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    try {
      // create an instance of the Okta Sign-In Widget
      const oktaSignIn = new OktaSignIn({
        baseUrl: oktaOrgUrl,
        el: "#widget-container",
        redirectUrl: window.location.origin,
        clientId: oktaClientId,
        authParams: {
          pkce: true,
          display: "page",
          issuer: `${oktaOrgUrl}/oauth2/default`,
        },
        features: {
          registration: true,
        },
      });
      await registerButtonEvents(oktaSignIn);
      await runOktaLogin(oktaSignIn);
    } catch (err) {
      console.log(err);
      displayMessage(err.message);
    }
  },
  false
);
