import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import ExecutiveDashboard from "@/frontend/features/dashboard/components/ExecutiveDashboard";

export default function Home() {
  return (
    <DynamicBackground>
      <div className="p-8">
        <ExecutiveDashboard />
      </div>
    </DynamicBackground>
  );
}
