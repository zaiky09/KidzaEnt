//Purpose: Protects routes by verifying JWT tokens and user roles

const jwt = require('jsonwebtoken');

//Bouncer 1: Verifies that the user is logged in.
const verifyToken = (req, res, next) => {
    //Grab the token from the headers sent by the frontend
    const token = req.header('Authorization');

    //If there is no token, deny access
    if (!token) {
        return res.status(401).json({ message: 'Access denied. Please log in first' });
    }

    try {
        //Tokens usually come in the format "Bearer <token_string>"
        //We split it to just get the token string itself
        const tokenString = token.startsWith('Bearer ') ? token.split(' ')[1] : token;

        //Verify the token using the secret key we defined in the .env file (fallback to default so tokens created without an env var still work)
        const verified = jwt.verify(tokenString, process.env.JWT_SECRET || 'supersecretkey');

        //Attach the user information (userId, role) to the request
        req.user = verified;

        //Move on to the next function (let them into the club)
        next();
    } catch (error) {
        res.status(400).json({ message: 'Invalid token. Please log in again' });
    }
};

//Bouncer 2: Checks if the user has the required role to access a route
const verifyAdmin = (req, res, next) => {
    //We check the role that we attached in the verifyToken function
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. You do not have permission to access this resource' });
    }
    //If they are an admin, let them through
        next();
};

module.exports = { verifyToken, verifyAdmin };