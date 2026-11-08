import { FolderOpen } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";

export default function PlaceholderPage({ title }) {
  return (
    <div>
      <h1 className="font-display font-semibold text-2xl mb-4">{title}</h1>
      <Card hoverable={false}>
        <EmptyState
          icon={FolderOpen}
          title={`${title} is coming up next`}
          description="This section follows the same architecture as the Dashboard — it'll be built out in the next pass."
        />
      </Card>
    </div>
  );
}
