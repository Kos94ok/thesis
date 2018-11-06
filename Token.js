import jwt from 'jsonwebtoken';

const secret = 'ssshhh';
const user = {
	id: 123,
	scopes: ['users:read']
};
const token = jwt.sign({ user }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRATION_TIME });
console.log(`JWT issued: ${token}`);