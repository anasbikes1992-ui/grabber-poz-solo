import { describe, expect, it } from 'vitest';
import {
  ONBOARDING_WIZARD_STEPS,
  buildWizardSteps,
  type OnboardingMilestone,
} from '../src/lib/setup/onboarding-milestones';

function milestone(
  id: string,
  done: boolean,
  required = true,
): OnboardingMilestone {
  return {
    id,
    title: id,
    description: id,
    href: '/',
    done,
    required,
    order: 1,
    action: 'link',
  };
}

describe('M7-S1 onboarding wizard', () => {
  it('defines seven ordered wizard steps with unique ids', () => {
    expect(ONBOARDING_WIZARD_STEPS).toHaveLength(7);
    const ids = ONBOARDING_WIZARD_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(7);
    expect(ids[0]).toBe('welcome');
    expect(ids.at(-1)).toBe('first_sale');
    for (let i = 1; i < ONBOARDING_WIZARD_STEPS.length; i++) {
      expect(ONBOARDING_WIZARD_STEPS[i].order).toBeGreaterThan(ONBOARDING_WIZARD_STEPS[i - 1].order);
    }
  });

  it('marks current step as first incomplete required step', () => {
    const milestones = [
      milestone('database', true),
      milestone('preset', true),
      milestone('profile', false),
      milestone('operations', false),
      milestone('seed', false),
      milestone('integrations', false, false),
      milestone('storefront', false, false),
      milestone('automation', false, false),
      milestone('first_sale', false, false),
    ];
    const { wizardSteps, currentStepId } = buildWizardSteps(milestones);
    expect(currentStepId).toBe('business');
    const business = wizardSteps.find((s) => s.id === 'business')!;
    expect(business.done).toBe(false);
    expect(business.milestoneDoneCount).toBe(1);
    expect(business.milestoneTotal).toBe(2);
  });

  it('does not treat optional steps as blocking current when required are done', () => {
    const milestones = [
      milestone('database', true),
      milestone('preset', true),
      milestone('profile', true),
      milestone('operations', true),
      milestone('seed', true),
      milestone('integrations', false, false),
      milestone('storefront', false, false),
      milestone('automation', false, false),
      milestone('first_sale', false, false),
    ];
    const { currentStepId, wizardSteps } = buildWizardSteps(milestones);
    expect(wizardSteps.filter((s) => s.required).every((s) => s.done)).toBe(true);
    expect(currentStepId).toBe('channels');
  });

  it('returns null currentStepId when every wizard step is done', () => {
    const milestones = [
      milestone('database', true),
      milestone('preset', true),
      milestone('profile', true),
      milestone('operations', true),
      milestone('seed', true),
      milestone('integrations', true, false),
      milestone('storefront', true, false),
      milestone('automation', true, false),
      milestone('first_sale', true, false),
    ];
    const { currentStepId } = buildWizardSteps(milestones);
    expect(currentStepId).toBeNull();
  });
});
