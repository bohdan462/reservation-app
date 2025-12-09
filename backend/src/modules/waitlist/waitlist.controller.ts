import { Request, Response } from 'express';
import { WaitlistService } from './waitlist.service';
import {
  createWaitlistSchema,
  updateWaitlistSchema,
  getWaitlistQuerySchema,
} from './waitlist.schema';
import { WaitlistStatus } from '@prisma/client';

export class WaitlistController {
  private waitlistService: WaitlistService;

  constructor() {
    this.waitlistService = new WaitlistService();
  }

  /**
   * POST /api/waitlist
   * Create a new waitlist entry
   */
  createEntry = async (req: Request, res: Response): Promise<void> => {
    try {
      const validatedData = createWaitlistSchema.parse(req.body);

      const entry = await this.waitlistService.createEntry({
        ...validatedData,
        date: new Date(validatedData.date),
      });

      res.status(201).json({ waitlistEntry: entry });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      console.error('Error creating waitlist entry:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * GET /api/waitlist
   * Get waitlist entries with optional filters
   */
  getEntries = async (req: Request, res: Response): Promise<void> => {
    try {
      const validatedQuery = getWaitlistQuerySchema.parse(req.query);

      const entries = await this.waitlistService.getEntries(
        validatedQuery.date ? new Date(validatedQuery.date) : undefined,
        validatedQuery.status as WaitlistStatus | undefined
      );

      res.json({ waitlistEntries: entries });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      console.error('Error fetching waitlist entries:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * GET /api/waitlist/:id
   * Get a single waitlist entry
   */
  getEntryById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const entry = await this.waitlistService.getEntryById(id);

      if (!entry) {
        res.status(404).json({ error: 'Waitlist entry not found' });
        return;
      }

      res.json({ waitlistEntry: entry });
    } catch (error) {
      console.error('Error fetching waitlist entry:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * PATCH /api/waitlist/:id
   * Update a waitlist entry
   */
  updateEntry = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const validatedData = updateWaitlistSchema.parse(req.body);

      const entry = await this.waitlistService.updateEntry(id, validatedData);

      res.json({ waitlistEntry: entry });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      console.error('Error updating waitlist entry:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
