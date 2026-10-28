"use client";

import { useQuery } from "convex/react";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { ShieldAlert } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { AdminOverview } from "@/components/admin/admin-overview";
import { AuditTable } from "@/components/admin/audit-table";
import { CreatorsTable } from "@/components/admin/creators-table";
import { EventsTables } from "@/components/admin/events-tables";
import { HeldFundsTable } from "@/components/admin/held-funds-table";
import { MessagesTable } from "@/components/admin/messages-table";
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

const ADMIN_TABS = [
  "overview",
  "creators",
  "held",
  "payouts",
  "events",
  "messages",
  "audit",
] as const;
type AdminTab = (typeof ADMIN_TABS)[number];

const tabParser = parseAsStringEnum<AdminTab>([...ADMIN_TABS]).withDefault(
  "overview",
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
      <div className="-mx-4 w-full scrollbar-none overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <TabsList className="h-9 w-max min-w-full justify-start sm:h-8 sm:min-w-0">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="creators">Creators</TabsTrigger>
          <TabsTrigger value="held">Held funds</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="overview" className="mt-2 min-w-0">
        <AdminOverview />
      </TabsContent>
      <TabsContent value="creators" className="mt-2 min-w-0">
        <CreatorsTable />
      </TabsContent>
      <TabsContent value="held" className="mt-2 min-w-0">
        <HeldFundsTable />
      </TabsContent>
      <TabsContent value="payouts" className="mt-2 min-w-0">
        <PayoutsTable />
      </TabsContent>
      <TabsContent value="events" className="mt-2 min-w-0">
        <EventsTables />
      </TabsContent>
      <TabsContent value="messages" className="mt-2 min-w-0">
        <MessagesTable />
      </TabsContent>
      <TabsContent value="audit" className="mt-2 min-w-0">
        <AuditTable />
      </TabsContent>
    </Tabs>
  );
}
