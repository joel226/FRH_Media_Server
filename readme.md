# Fossil Media Server #
It's a little server for serving media content
Yeah that's about all it does

### Important stuff about the backend that you should read ### 

(intended for the other IT people, not random passerby people)
- Make sure the packages necessary are installed. Run "npm install" to do so
- MongoDB is required, as session information is stored there
- The server runs on port 8099. **Do not change this**, as only localhost:8099 is whitelisted with Azure AD for the time being. 
- /protected is a static directory for the time being. Anything put under there can be accessed (with authentication) from /secure/[filename], like the demo page shown after successfully logging in. 
- While any user in the PSD AD can login, access is restricted to those under the whitelist. That currently consists of me (Ryan), Joel, and Mike -- so if say Chris signs in it should (theoretically) give an error message. That means that access control does indeed work. 