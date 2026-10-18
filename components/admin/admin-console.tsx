"use client";

import { useQuery } from "convex/react";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { ShieldAlert } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { CreatorsTable } from "@/components/admin/creators-table";
import { EventsTables } from "@/components/admin/events-tables";
import { PayoutsTable } from "@/components/admin/payouts-table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ADMIN_TABS = ["creators", "payouts", "events"] as const;
type AdminTab = (typeof ADMIN_TABS)[number];

const tabParser = parseAsStringEnum<AdminTab>([...ADMIN_TABS]).withDefault(
  "creators",
);

/**
 * Admin gate: `amIAdmin` is the only admin function called until access is
 * confirmed, so non-admins never trigger `forbidden` errors from the tables.
 */
export function AdminConsole() {
  const isAdmin = useQuery(api.admin.amIAdmin, {});

  if (isAdmin === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShieldAlert />
          </EmptyMedia>
          <EmptyTitle>Admin access required</EmptyTitle>
          <EmptyDescription>
            Ask the team to add your email to ADMIN_EMAILS on the deployment to
            get access.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return <AdminTabs />;
}

function AdminTabs() {
  const [tab, setTab] = useQueryState("tab", tabParser);

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        void setTab(value as AdminTab);
      }}
    >
      <TabsList className="w-fit">
        <TabsTrigger value="creators">Creators</TabsTrigger>
        <TabsTrigger value="payouts">Payouts</TabsTrigger>
        <TabsTrigger value="events">Events</TabsTrigger>
      </TabsList>
      <TabsContent value="creators">
        <CreatorsTable />
      </TabsContent>
      <TabsContent value="payouts">
        <PayoutsTable />
      </TabsContent>
      <TabsContent value="events">
        <EventsTables />
      </TabsContent>
    </Tabs>
  );
}
