const jwt = require('jsonwebtoken')

module.exports = function verifyToken (req,res, next) {
   
    const token = req.headers["authorization"]
        console.log(token);

    if(!token){
        return res.status(403).send({error:"No token Provided 🙆🏻‍♂️"})
    }
   
    jwt.verify(token, process.env.USER_ACCESS_TOKEN_SECRET, (err, decode) => {
                    // console.log(err,"hau");
        if(err) {    
           
            return res.status(401).json({error: "Unathorazed😠"})
        }
        req.username = decode.username
        next()    
    })

}