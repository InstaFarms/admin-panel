import CreatePropertyEditor from "@/components/properties/create-property/CreatePropertyEditor";

export default function CreatePropertyPage() {
  const sources = [
    {
      id: "INSTAFARMS_EXCLUSIVE",
      name: "InstaFarms Exclusive",
      description: "Manage solely on InstaFarms."
    },
    {
      id: "MAGO",
      name: "Mago",
      description: "Manage through Mago. Automatically synced to InstaFarms."
    },
    {
      id: "ELIVAAS",
      name: "Elivaas",
      description: "Sourced from Elivaas. Automatically synced to InstaFarms."
    }
  ];

  return (
    <div className="flex w-full flex-col">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto flex w-full flex-col overflow-visible">
          <CreatePropertyEditor sources={sources} />
        </div>
      </div>
    </div>
  );
}
