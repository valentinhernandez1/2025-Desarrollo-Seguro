import { Request, Response, NextFunction } from 'express';
import ClinicalHistoryService from '../services/clinicalHistoryService';

export const listClinicalHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to   = req.query.to   ? new Date(req.query.to as string)   : undefined;

    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const list = await ClinicalHistoryService.list(req.user.id, { from, to });
    res.json(list);
  } catch (err) {
    next(err);
  }
};

export const getClinicalHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const record = await ClinicalHistoryService.getById(req.params.id, req.user.id);
    res.json(record);
  } catch (err) {
    next(err);
  }
};

export const createClinicalHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { doctorName, diagnose } = req.body;

    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const created = await ClinicalHistoryService.create(req.user.id, {
      doctorName,
      diagnose,
      files: [] 
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};


