import { SeedarrLogoSad } from "@/shared/components/seedarr-logo";
import { Card, CardContent } from "@/shared/ui/card";

interface PlaceholderEmptyProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
}

export function PlaceholderEmpty({ title, subtitle }: PlaceholderEmptyProps) {
  return (
    <Card className="w-full bg-secondary">
      <CardContent className="flex flex-col items-center justify-center py-16 gap-6">
        <SeedarrLogoSad />
        {(title || subtitle) && (
          <div className="text-center space-y-2">
            {title && <h3 className="text-xl font-semibold">{title}</h3>}
            {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
