/** Base toast: dark card with border and shadow */
const appTheme = {
  background: "#1e293b",
  color: "#f1f5f9",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  borderRadius: "12px",
  boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.35)",
}

const appToastSuccessTheme = {
  primary: "#059669",
  secondary: "#ecfdf5",
}

const appToastErrorTheme = {
  primary: "#dc2626",
  secondary: "#fef2f2",
}

const appToastLoadingTheme = {
  primary: "#0ea5e9",
  secondary: "#f0f9ff",
}

/** Success toast: subtle green tint */
const appToastSuccessStyle = {
  ...appTheme,
  background: "linear-gradient(135deg, #064e3b 0%, #1e293b 100%)",
  border: "1px solid rgba(5, 150, 105, 0.4)",
}

/** Error toast: subtle red tint */
const appToastErrorStyle = {
  ...appTheme,
  background: "linear-gradient(135deg, #450a0a 0%, #1e293b 100%)",
  border: "1px solid rgba(220, 38, 38, 0.4)",
}

/** Loading toast: subtle blue tint */
const appToastLoadingStyle = {
  ...appTheme,
  background: "linear-gradient(135deg, #0c4a6e 0%, #1e293b 100%)",
  border: "1px solid rgba(14, 165, 233, 0.4)",
}

export {
  appTheme,
  appToastSuccessTheme,
  appToastErrorTheme,
  appToastLoadingTheme,
  appToastSuccessStyle,
  appToastErrorStyle,
  appToastLoadingStyle,
}