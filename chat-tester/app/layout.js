import "./globals.css";

export const metadata = {
  title: "Cloud Run Chat Tester",
  description: "Test your vLLM /v1/chat/completions endpoint on Cloud Run",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
