import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"

const handler = NextAuth({
  providers: [
    // Real Google OAuth provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // Email/Password Login
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          const res = await fetch("http://127.0.0.1:8000/api/v1/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials?.email,
              password: credentials?.password
            })
          })

          const data = await res.json()
          if (res.ok && data.access_token) {
            return {
              id: data.user.id.toString(),
              name: `${data.user.nombre} ${data.user.apellido}`,
              email: data.user.email,
              image: data.user.avatar_url,
              accessToken: data.access_token,
              role: data.user.rol
            }
          }
          return null
        } catch (error) {
          console.error("Backend login error:", error)
          return null
        }
      }
    })
  ],
  callbacks: {
    // When Google login succeeds, exchange the Google profile for our backend JWT
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const res = await fetch("http://127.0.0.1:8000/api/v1/auth/oauth/callback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: "google",
              access_token: account.access_token,
              email: user.email,
              nombre: user.name?.split(" ")[0] ?? "Usuario",
              apellido: user.name?.split(" ").slice(1).join(" ") ?? "",
              avatar_url: user.image ?? null
            })
          })

          const data = await res.json()
          if (res.ok && data.access_token) {
            // Attach backend token and role to the user object for jwt callback
            user.accessToken = data.access_token
            user.role = data.user.rol
            return true
          }
          return false
        } catch (error) {
          console.error("Backend Google OAuth error:", error)
          return false
        }
      }
      // For credentials provider, signIn is already handled in authorize()
      return true
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.accessToken = user.accessToken
        token.role = user.role
      }
      return token
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.user.role = token.role as string
      return session
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt"
  }
})

export { handler as GET, handler as POST }
