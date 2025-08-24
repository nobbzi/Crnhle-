export const metadata = { title: "Jordy C BBQ Cup", description: "BBQ Cornhole Cup — groups, round robin, knockout, live scoreboard & coin flip." };
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
