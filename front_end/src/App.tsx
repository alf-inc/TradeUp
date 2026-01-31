import { useState } from "react";
import MainApp from "./MainApp";
import { LoginRegisterScreen } from "./components/LoginRegisterScreen";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return isLoggedIn ? (
    <MainApp />
  ) : (
    <LoginRegisterScreen onLogin={() => setIsLoggedIn(true)} />
  );
}