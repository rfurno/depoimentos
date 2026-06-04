import { redirect } from "next/navigation";

export default function ProjectsIndex() {
  // For foundation, just redirect to dashboard. Real list in Phase 2.
  redirect("/dashboard");
}
