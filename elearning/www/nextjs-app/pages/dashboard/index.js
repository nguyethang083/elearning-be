import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import DashboardContent from "@/components/DashboardContent";
import ProfileSetting from "@/components/ProfileSetting";

export default function Dashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loggedInUser = localStorage.getItem("user");
    let userData = null;

    if (loggedInUser) {
      try {
        userData = JSON.parse(loggedInUser);
        setUser(userData);
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
      }
    }

    if (status === "authenticated" && session?.user) {
      const sessionUser = {
        userId: session.user.userId || session.user.id || session.user.email,
        name: session.user.name,
        email: session.user.email,
        avatar: session.user.avatar || session.user.image,
        roles: session.user.roles || ["Student"],
      };

      localStorage.setItem("user", JSON.stringify(sessionUser));
      setUser(sessionUser);
    }

    if (!userData && status !== "loading" && status !== "authenticated") {
      router.push("/login");
    }
  }, [router, session, status]);

  if (status === "loading" || (!user && status === "authenticated")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user && status !== "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Redirecting to login...
      </div>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Main dashboard content in grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <DashboardContent user={user} />
          </div>
          <div className="lg:col-span-1">
            <ProfileSetting user={user} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
