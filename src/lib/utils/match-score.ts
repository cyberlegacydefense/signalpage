import type { ParsedResume, ParsedJobRequirements, MatchBreakdown } from '@/types';

/**
 * Calculate a match score between a resume and job requirements
 * Returns a score from 0-100 and a detailed breakdown
 */
export function calculateMatchScore(
  resume: ParsedResume,
  requirements: ParsedJobRequirements
): { score: number; breakdown: MatchBreakdown } {
  // Normalize skills for comparison (lowercase, trim)
  const normalizeSkill = (skill: string) => skill.toLowerCase().trim();

  const resumeSkills = new Set(resume.skills.map(normalizeSkill));

  // Add technologies from experiences
  resume.experiences.forEach(exp => {
    exp.technologies?.forEach(tech => resumeSkills.add(normalizeSkill(tech)));
  });

  // Add technologies from projects
  resume.projects?.forEach(proj => {
    proj.technologies?.forEach(tech => resumeSkills.add(normalizeSkill(tech)));
  });

  // Get all required and preferred skills
  const requiredSkills = requirements.required_skills.map(normalizeSkill);
  const preferredSkills = requirements.preferred_skills.map(normalizeSkill);
  const allJobSkills = [...new Set([...requiredSkills, ...preferredSkills])];

  // Calculate skill matches
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  allJobSkills.forEach(jobSkill => {
    // Check for exact or partial match
    const hasMatch = Array.from(resumeSkills).some(resumeSkill =>
      resumeSkill.includes(jobSkill) ||
      jobSkill.includes(resumeSkill) ||
      // Check for common variations
      areSkillsSimilar(resumeSkill, jobSkill)
    );

    if (hasMatch) {
      matchedSkills.push(jobSkill);
    } else {
      missingSkills.push(jobSkill);
    }
  });

  // Calculate component scores
  const skillsMatchPercent = allJobSkills.length > 0
    ? (matchedSkills.length / allJobSkills.length) * 100
    : 100;

  // Experience match based on responsibilities alignment
  const experienceMatchPercent = calculateExperienceMatch(resume, requirements);

  // Requirements match based on fit bullets potential
  const requirementsMatchPercent = calculateRequirementsMatch(resume, requirements);

  // Weighted final score
  // Skills: 40%, Experience: 35%, Requirements: 25%
  const finalScore = Math.round(
    (skillsMatchPercent * 0.4) +
    (experienceMatchPercent * 0.35) +
    (requirementsMatchPercent * 0.25)
  );

  return {
    score: Math.min(100, Math.max(0, finalScore)),
    breakdown: {
      skills_match: Math.round(skillsMatchPercent),
      experience_match: Math.round(experienceMatchPercent),
      requirements_match: Math.round(requirementsMatchPercent),
      matched_skills: matchedSkills,
      missing_skills: missingSkills,
      total_required_skills: allJobSkills.length,
      total_matched_skills: matchedSkills.length,
    }
  };
}

/**
 * Check if two skills are similar (handles common variations)
 */
function areSkillsSimilar(skill1: string, skill2: string): boolean {
  // Common skill name mappings
  const skillMappings: Record<string, string[]> = {
    'javascript': ['js', 'ecmascript'],
    'typescript': ['ts'],
    'python': ['py'],
    'react': ['reactjs', 'react.js'],
    'node': ['nodejs', 'node.js'],
    'postgres': ['postgresql', 'psql'],
    'mongodb': ['mongo'],
    'kubernetes': ['k8s'],
    'aws': ['amazon web services'],
    'gcp': ['google cloud', 'google cloud platform'],
    'azure': ['microsoft azure'],
    'ml': ['machine learning'],
    'ai': ['artificial intelligence'],
    'ci/cd': ['cicd', 'continuous integration', 'continuous deployment'],
    'docker': ['containers', 'containerization'],
  };

  // Check if skills map to the same thing
  for (const [canonical, variations] of Object.entries(skillMappings)) {
    const allVariations = [canonical, ...variations];
    if (allVariations.includes(skill1) && allVariations.includes(skill2)) {
      return true;
    }
    if (allVariations.some(v => skill1.includes(v)) && allVariations.some(v => skill2.includes(v))) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate experience match based on responsibilities
 */
function calculateExperienceMatch(
  resume: ParsedResume,
  requirements: ParsedJobRequirements
): number {
  if (!requirements.responsibilities || requirements.responsibilities.length === 0) {
    return 75; // Default if no responsibilities specified
  }

  // Combine all experience descriptions and achievements
  const experienceText = resume.experiences
    .map(exp => `${exp.description} ${exp.achievements.join(' ')}`)
    .join(' ')
    .toLowerCase();

  // Check how many responsibilities have related experience
  let matchedResponsibilities = 0;

  requirements.responsibilities.forEach(resp => {
    const keywords = resp.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const hasMatch = keywords.some(keyword => experienceText.includes(keyword));
    if (hasMatch) matchedResponsibilities++;
  });

  return (matchedResponsibilities / requirements.responsibilities.length) * 100;
}

/**
 * Calculate requirements match based on business problems alignment
 */
function calculateRequirementsMatch(
  resume: ParsedResume,
  requirements: ParsedJobRequirements
): number {
  if (!requirements.business_problems || requirements.business_problems.length === 0) {
    return 75; // Default if no business problems specified
  }

  // Combine all achievements and project highlights
  const achievementsText = [
    ...resume.experiences.flatMap(exp => exp.achievements),
    ...(resume.projects?.flatMap(proj => proj.highlights) || []),
  ].join(' ').toLowerCase();

  // Check alignment with business problems
  let alignedProblems = 0;

  requirements.business_problems.forEach(problem => {
    const keywords = problem.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const hasAlignment = keywords.some(keyword => achievementsText.includes(keyword));
    if (hasAlignment) alignedProblems++;
  });

  return (alignedProblems / requirements.business_problems.length) * 100;
}

/**
 * Get a color class based on match score
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Get a background color class based on match score
 */
export function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-100';
  if (score >= 60) return 'bg-blue-100';
  if (score >= 40) return 'bg-yellow-100';
  return 'bg-red-100';
}

/**
 * Get a label based on match score
 */
export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent Match';
  if (score >= 60) return 'Strong Match';
  if (score >= 40) return 'Moderate Match';
  return 'Needs Review';
}
