import "../styles/globals.css";
import "katex/dist/katex.min.css";
import "../styles/tour.css";
import { SessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { handleNextAuthLogin } from "../middleware/auth";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import ChatBubble from "@/components/chatbot/ChatBubble";
import { Toaster } from "sonner";
import { NextStepProvider, NextStep } from "nextstepjs";
import { dashboardTourSteps, TOUR_STORAGE_KEY } from "@/config/dashboardTour";
import {
  learnTopicWelcomeTourSteps,
  learnTopicTourSteps,
  learnModeTourSteps,
  LEARN_TOPIC_WELCOME_TOUR_STORAGE_KEY,
  LEARN_TOPIC_TOUR_STORAGE_KEY,
  LEARN_MODE_DETAIL_TOUR_STORAGE_KEY,
} from "@/config/learnTour";
import { testTourSteps, TEST_TOUR_STORAGE_KEY } from "@/config/testTour";
import TourCard from "@/components/TourCard";

function AuthWrapper({ children }) {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.frappeAuthToken) {
      handleNextAuthLogin(session);
    }
  }, [session]);

  return children;
}

export default function MyApp({
  Component,
  pageProps: { session, ...pageProps },
}) {
  const router = useRouter();

  // Define routes that should use the DashboardLayout
  const dashboardRoutes = [
    "/test",
    "/report",
    "/analysis",
    "/learn",
    "/my-pathway",
  ];

  // Check if the current route starts with any of the dashboard routes
  const isDashboardRoute = dashboardRoutes.some((route) =>
    router.pathname.startsWith(route)
  );

  // Collapse the sidebar for `/test` routes
  const isSidebarCollapsed = ["/test", "/report", "/my-pathway"].some((route) =>
    router.pathname.startsWith(route)
  );
  return (
    <SessionProvider session={session}>
      <NextStepProvider>
        <NextStep
          steps={[
            ...dashboardTourSteps,
            ...learnTopicWelcomeTourSteps,
            ...learnTopicTourSteps,
            ...learnModeTourSteps,
            ...testTourSteps,
          ]}
          shadowRgb="55,48,163"
          shadowOpacity="0.5"
          cardComponent={TourCard}
          scrollToElement={{
            enabled: false,
          }}
          cardTransition={{
            duration: 0.3,
            ease: "easeOut",
          }}
          onComplete={(tourName) => {
            if (typeof window !== "undefined") {
              if (tourName === "dashboard") {
                localStorage.setItem(TOUR_STORAGE_KEY, "true");
              } else if (tourName === "learn-topic-welcome") {
                localStorage.setItem(
                  LEARN_TOPIC_WELCOME_TOUR_STORAGE_KEY,
                  "true"
                );
              } else if (tourName === "learn-topic") {
                localStorage.setItem(LEARN_TOPIC_TOUR_STORAGE_KEY, "true");
              } else if (tourName === "learn-mode-detail") {
                localStorage.setItem(
                  LEARN_MODE_DETAIL_TOUR_STORAGE_KEY,
                  "true"
                );
              } else if (tourName === "test-page") {
                localStorage.setItem(TEST_TOUR_STORAGE_KEY, "true");
              }
            }
          }}
          onSkip={(step, tourName) => {
            if (typeof window !== "undefined") {
              if (tourName === "dashboard") {
                localStorage.setItem(TOUR_STORAGE_KEY, "true");
              } else if (tourName === "learn-topic-welcome") {
                localStorage.setItem(
                  LEARN_TOPIC_WELCOME_TOUR_STORAGE_KEY,
                  "true"
                );
              } else if (tourName === "learn-topic") {
                localStorage.setItem(LEARN_TOPIC_TOUR_STORAGE_KEY, "true");
              } else if (tourName === "learn-mode-detail") {
                localStorage.setItem(
                  LEARN_MODE_DETAIL_TOUR_STORAGE_KEY,
                  "true"
                );
              } else if (tourName === "test-page") {
                localStorage.setItem(TEST_TOUR_STORAGE_KEY, "true");
              }
            }
          }}
        >
          <AuthWrapper>
            {isDashboardRoute ? (
              <DashboardLayout isCollapsed={isSidebarCollapsed}>
                <Component {...pageProps} />
              </DashboardLayout>
            ) : (
              <Component {...pageProps} />
            )}
            <Toaster richColors position="top-center" />
            <ChatBubble />
          </AuthWrapper>
        </NextStep>
      </NextStepProvider>
    </SessionProvider>
  );
}
