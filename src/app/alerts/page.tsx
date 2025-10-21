import AlertsBrowse from "@/components/AlertsBrowse";
import { Suspense } from "react";

export default function AlertsIndex() {
  return (
    <Suspense fallback={null}>
      <AlertsBrowse />
    </Suspense>
  );
}
