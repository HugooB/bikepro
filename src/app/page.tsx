import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const upcoming = [
  "Your bikes and all their parts",
  "Age and wear status for every part",
  "Maintenance logs and service rounds",
];

export default function Home() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <p className="text-brand text-sm font-medium">Welcome</p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Never wonder how old your chain is again.
        </h1>
        <p className="text-muted-foreground max-w-prose">
          BikePro keeps track of every part on your bike and tells you when it&apos;s due for
          maintenance.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Your garage is empty</CardTitle>
          <CardDescription>Bikes will appear here once adding them is available.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2 text-sm">
            {upcoming.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span aria-hidden className="bg-brand size-1.5 rounded-full" />
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
