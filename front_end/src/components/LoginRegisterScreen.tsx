import { useState } from "react";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../firebase/firebase";

import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";

interface LoginRegisterScreenProps {
  onLogin: () => void;
}

export function LoginRegisterScreen({ onLogin }: LoginRegisterScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState("");

  const [name, setName] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      if (mode === "register") {
        // await createUserWithEmailAndPassword(auth, email, password);
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const user = cred.user;

      await setDoc(doc(db, "users", user.uid), {
        userId: user.uid,
        name: name,
        email: user.email ?? "",
        bio: "",
        photoURL: user.photoURL ?? "",
        liked_items: [],
        createdAt: Date.now(),
      });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }

      onLogin();
    } catch (err: any) {
      setError(err?.message ?? "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setMessage(null);

    if (!email.trim()) {
      setError("Enter your email first, then click Forgot password.");
      return;
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email.trim());
      setMessage("Password reset email sent. Check your inbox (and spam).");
    } catch (e: any) {
      const code = e?.code as string | undefined;

      if (code === "auth/user-not-found") {
        setError("No account found with that email.");
      } else if (code === "auth/invalid-email") {
        setError("That email address looks invalid.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Try again later.");
      } else {
        setError("Could not send reset email. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-center">Welcome</CardTitle>
          <CardDescription className="text-center">
            Sign in to your account or create a new one
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
          {message && <p className="text-sm text-green-600 mb-2">{message}</p>}

          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v as "login" | "register")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="name@example.com"
                      className="pl-10"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm text-gray-600">Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-indigo-600 hover:underline"
                    disabled={loading}
                  >
                    Forgot password?
                  </button>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Loading..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="John Doe"
                      className="pl-10"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="name@example.com"
                      className="pl-10"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <input type="checkbox" className="mt-1 rounded" required />
                  <span className="text-sm text-gray-600">
                    I agree to the{" "}
                    <a href="#" className="text-indigo-600 hover:underline">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="#" className="text-indigo-600 hover:underline">
                      Privacy Policy
                    </a>
                  </span>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Loading..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="flex justify-center border-t pt-4">
          <p className="text-sm text-gray-600">
            Secure login powered by encryption
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

