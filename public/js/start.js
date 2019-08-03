// 

var msalConfig = {
  auth: {
      clientId: "8c9b06de-5030-4639-a42b-13dabe9b789e",
      authority: "https://login.microsoftonline.com/0d6d846c-eadd-4b6c-b03e-f15cd4b7e9cf"
  },
  cache: {
      cacheLocation: "localStorage",
      storeAuthStateInCookie: true
  }
};

var graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me"
};

// create a request object for login or token request calls
// In scenarios with incremental consent, the request object can be further customized
var requestObj = {
  scopes: ["user.read"]
};

var myMSALObj = new Msal.UserAgentApplication(msalConfig);

// Register Callbacks for redirect flow
// myMSALObj.handleRedirectCallbacks(acquireTokenRedirectCallBack, acquireTokenErrorRedirectCallBack);
myMSALObj.handleRedirectCallback(authRedirectCallBack);

function initLogin() {
  myMSALObj.loginPopup(requestObj).then(function (loginResponse) {
      //Successful login
      showWelcomeMessage();
      //Call MS Graph using the token in the response
      acquireTokenPopupAndCallMSGraph();
  }).catch(function (error) {
      //Please check the console for errors
      console.log(error);
  });
}

function logout() {
  $('#logout-btn').html(`<i class='fas fa-fw fa-circle-notch fa-spin'></i> Signing Out...`)
  $.post('../signout', () => {
    myMSALObj.logout();
  })
}

function acquireTokenPopupAndCallMSGraph() {
  //Always start with acquireTokenSilent to obtain a token in the signed in user from cache
  myMSALObj.acquireTokenSilent(requestObj).then(function (tokenResponse) {
      authenticate(tokenResponse.accessToken);
  }).catch(function (error) {
      console.log(error);
      // Upon acquireTokenSilent failure (due to consent or interaction or login required ONLY)
      // Call acquireTokenPopup(popup window) 
      if (requiresInteraction(error.errorCode)) {
          myMSALObj.acquireTokenPopup(requestObj).then(function (tokenResponse) {
              authenticate(tokenResponse.accessToken);
          }).catch(function (error) {
              console.log(error);
          });
      }
  });
}

function authenticate(accessToken) {
  $.post('/verify', {
    token: accessToken
  }, (res) => {
    $('#json').text(JSON.stringify(res, null, 2));  
    if(res.access){
      $('#info-success').show()}
    else{
      $('#info-permError').hide(); 
      $('#info-noAccess').show()}
    $('#login-btn').html(`<i class='fas fa-fw fa-check'></i> You're signed in!`)
    $('#logout-btn').show(); 
  })
}

function showWelcomeMessage() {
  $('#login-btn').html(`<i class='fas fa-fw fa-circle-notch fa-spin'></i> Verifying...`)
}

//This function can be removed if you do not need to support IE
function acquireTokenRedirectAndCallMSGraph() {
  //Always start with acquireTokenSilent to obtain a token in the signed in user from cache
  myMSALObj.acquireTokenSilent(requestObj).then(function (tokenResponse) {
      authenticate(tokenResponse.accessToken);
  }).catch(function (error) {
      console.log(error);
      // Upon acquireTokenSilent failure (due to consent or interaction or login required ONLY)
      // Call acquireTokenRedirect
      if (requiresInteraction(error.errorCode)) {
          myMSALObj.acquireTokenRedirect(requestObj);
      }
  });
}

function authRedirectCallBack(error, response) {
  if (error) {
      console.log(error);
  } else {
      if (response.tokenType === "access_token") {
          authenticate(response.accessToken);
      } else {
          console.log("token type is:" + response.tokenType);
      }
  }
}

function requiresInteraction(errorCode) {
  if (!errorCode || !errorCode.length) {
      return false;
  }
  return errorCode === "consent_required" ||
      errorCode === "interaction_required" ||
      errorCode === "login_required";
}

// Browser check variables
var ua = window.navigator.userAgent;
var msie = ua.indexOf('MSIE ');
var msie11 = ua.indexOf('Trident/');
var msedge = ua.indexOf('Edge/');
var isIE = msie > 0 || msie11 > 0;
var isEdge = msedge > 0;

//If you support IE, our recommendation is that you sign-in using Redirect APIs
//If you as a developer are testing using Edge InPrivate mode, please add "isEdge" to the if check

// can change this to default an experience outside browser use
var loginType = isIE ? "REDIRECT" : "POPUP";

// runs on page load, change config to try different login types to see what is best for your application
if (loginType === 'POPUP') {
  if (myMSALObj.getAccount()) {// avoid duplicate code execution on page load in case of iframe and popup window.
      showWelcomeMessage();
      acquireTokenPopupAndCallMSGraph();
  }
}
else if (loginType === 'REDIRECT') {
  document.getElementById("login-btn").onclick = function () {
      myMSALObj.loginRedirect(requestObj);
  };

  if (myMSALObj.getAccount() && !myMSALObj.isCallback(window.location.hash)) {// avoid duplicate code execution on page load in case of iframe and popup window.
      showWelcomeMessage();
      acquireTokenRedirectAndCallMSGraph();
  }
} else {
  console.error('Please set a valid login type');
}

$('body').on('ready', () => {
  if(location.hash === '#permError'){
    $('#info-permError').show(); 
  }
})