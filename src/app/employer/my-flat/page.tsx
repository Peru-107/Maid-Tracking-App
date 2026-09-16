import { getCurrentUser } from "@/lib/auth";
import { getDictionary, type Locale } from "@/lib/i18n";
import { MyFlatView } from "@/components/employer/my-flat-view";

export default async function MyFlatPage() {
  const user = await getCurrentUser();
  const t = getDictionary(user!.languagePref as Locale);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">{t.my_flat}</h1>
      <MyFlatView t={t} />
    </div>
  );
}
