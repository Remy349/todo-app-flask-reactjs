import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignInCard } from "./_components/sign-in/card";
import { CreateAccountCard } from "./_components/create-account/card";

export const HomePage = () => {
  return (
    <section className="cs-section">
      <div className="cs-container">
        <h1 className="font-bold text-2xl text-center mb-2 md:text-3xl md:max-w-lg md:mx-auto lg:text-4xl lg:max-w-xl">
          Effortless Task Management with TodoApp
        </h1>
        <p className="text-sm text-center text-muted-foreground mb-8 md:max-w-2xl md:mx-auto">
          Stay organized and boost your productivity with TodoApp! Create,
          prioritize, and manage your tasks seamlessly in a clean, user-friendly
          interface accessible anytime, anywhere.
        </p>
        <div className="md:max-w-lg md:mx-auto">
          <Tabs defaultValue="signIn">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="signIn">Sign In</TabsTrigger>
              <TabsTrigger value="createAccount">Create Account</TabsTrigger>
            </TabsList>
            <TabsContent value="signIn">
              <SignInCard />
            </TabsContent>
            <TabsContent value="createAccount">
              <CreateAccountCard />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
};
