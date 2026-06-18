import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "STARS — Student Attendance & Room Scheduling System" },
      { name: "description", content: "STARS: a professional university room booking, equipment loan and analytics platform." },
      { property: "og:title", content: "STARS — Student Attendance & Room Scheduling System" },
      { property: "og:description", content: "STARS: a professional university room booking, equipment loan and analytics platform." },
    ],
  }),
  component: Index,
});

function Index() {
  if (typeof window !== "undefined") {
    window.location.replace("/login.html");
  }
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F7FA", fontFamily: "Inter, system-ui, sans-serif", color: "#0F4C81" }}>
      Loading STARS…
    </div>
  );
}
