"use client";

import { useState } from "react";
import { TabItem, Tabs } from "flowbite-react";

import PropertyExpenseCategoriesSection from "./PropertyExpenseCategoriesSection";
import PropertyExpensesSection from "./PropertyExpensesSection";

export default function PropertyExpenseTabsSection({
  propertyId,
}: {
  propertyId: string;
}) {
  const [categoryRefreshKey, setCategoryRefreshKey] = useState(0);

  return (
    <Tabs>
      <TabItem title="Expense Categories">
        <PropertyExpenseCategoriesSection
          propertyId={propertyId}
          onChanged={() => setCategoryRefreshKey((key) => key + 1)}
        />
      </TabItem>
      <TabItem title="Expenses">
        <PropertyExpensesSection
          propertyId={propertyId}
          refreshKey={categoryRefreshKey}
        />
      </TabItem>
    </Tabs>
  );
}
