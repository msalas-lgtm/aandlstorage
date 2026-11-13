import type { Metadata } from "next";
import { submitWaitingList } from "@/app/requests/actions";
import { UnitRequestPage } from "@/app/requests/UnitRequestPage";

export const metadata: Metadata = {
  title: { absolute: "Join the Waiting List | A&L Self Storage" },
  robots: { index: false, follow: true },
};

export default function WaitingListPage({ searchParams }: PageProps<"/waiting_list">) {
  return (
    <UnitRequestPage
      title="Join the Waiting List"
      intro="This size is full right now. Add your name and we'll contact you as soon as one opens up."
      dateLabel="When do you need it?"
      submitLabel="Join the Waiting List"
      action={submitWaitingList}
      searchParams={searchParams}
    />
  );
}
