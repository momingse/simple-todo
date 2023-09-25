import { MongoDBAdapter } from '@auth/mongodb-adapter';
import clientPromise from './mongodb';
import { AuthOptions, getServerSession } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const nextauthOptions: AuthOptions = {
	adapter: MongoDBAdapter(clientPromise),
    secret: process.env.AUTH_SECRET!,
	session: {
		strategy: 'jwt',
	},
	pages: {
		signIn: '/login',
	},
	providers: [
		GoogleProvider({
			clientId: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
		}),
	],
	callbacks: {
		async jwt({ token, user }: any) {
			if (user) {
				token.user = {
					_id: user._id,
					email: user.email,
					name: user.name,
                    image: user.image,
				};
			}
			return token;
		},
		session: async ({ session, token }: any) => {
			if (token) {
				session.user = token.user;
			}
			return session;
		},
		redirect() {
			return '/';
		},
	},
};

export const getAuthSession = () => getServerSession(nextauthOptions);