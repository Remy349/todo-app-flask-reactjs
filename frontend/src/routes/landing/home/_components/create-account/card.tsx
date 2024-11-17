import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateAccountForm } from "./form";

export const CreateAccountCard = () => {
  return (
    <Card className="shadow-sm rounded-lg">
      <CardHeader>
        <CardTitle>Join Today</CardTitle>
        <CardDescription>
          Create an account to start organizing your tasks, setting priorities,
          and achieving your goals with ease.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CreateAccountForm />
      </CardContent>
    </Card>
  );
};
