import ChronicleDashboard, { DashboardView } from "./chronicle-dashboard";

const dashboardView = (value?: string | string[]): DashboardView => {
  const requested = Array.isArray(value) ? value[0] : value;
  return requested === "players" || requested === "characters" || requested === "games"
    ? requested
    : "overview";
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const params = await searchParams;
  return <ChronicleDashboard initialView={dashboardView(params.view)} />;
}
