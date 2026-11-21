import "./panel.css";
import { TopBar } from "./_ui/TopBar";

export const metadata = { title: "Gemelo · panel" };

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="gp">
      <TopBar />
      <main className="wrap">{children}</main>
    </div>
  );
}
