import { createBrowserRouter } from "react-router-dom";
import { ArchivedPage } from "./dashboard/archived/page";
import { DashboardHomePage } from "./dashboard/page";
import { DashboardRoot } from "./dashboard/root";
import { HomePage } from "./landing/home/page";
import { LandingRoot } from "./landing/root";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingRoot />,
    children: [{ index: true, element: <HomePage /> }],
  },
  {
    path: "/dashboard",
    element: <DashboardRoot />,
    children: [
      { index: true, element: <DashboardHomePage /> },
      { path: "archived", element: <ArchivedPage /> },
    ],
  },
]);
