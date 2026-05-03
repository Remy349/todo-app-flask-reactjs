import { createBrowserRouter } from "react-router-dom";
import { LandingRoot } from "./landing/root";
import { HomePage } from "./landing/home/page";
import { DashboardRoot } from "./dashboard/root";
import { DashboardHomePage } from "./dashboard/page";
import { ArchivedPage } from "./dashboard/archived/page";

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
