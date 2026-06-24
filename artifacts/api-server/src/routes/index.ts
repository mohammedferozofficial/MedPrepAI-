import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import pdfsRouter from "./pdfs";
import jobsRouter from "./jobs";
import dashboardRouter from "./dashboard";
import storageRouter from "./storage";
import questionsRouter from "./questions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(pdfsRouter);
router.use(jobsRouter);
router.use(dashboardRouter);
router.use(storageRouter);
router.use(questionsRouter);

export default router;
