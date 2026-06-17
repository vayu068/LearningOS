/**
 * Adaptive Learning Engine
 *
 * Analyzes student performance, builds knowledge graphs, generates personalized
 * learning paths, and adjusts difficulty dynamically based on Bloom's taxonomy levels.
 */

import type { AIProvider } from "../providers/base";
import type {
  LearningPath,
  LearningPathNode,
  StudentPerformance,
  StudentProfile,
  CompetencyLevel,
  ContentDifficulty,
  BloomsTaxonomyLevel,
  AdaptiveRule,
  KnowledgeGraph,
} from "../types";

export interface AdaptiveLearningConfig {
  minMasteryScore: number;
  maxAttemptsBeforeRemediation: number;
  difficultyAdjustmentThreshold: number;
  targetBloomsProgression: boolean;
}

const DEFAULT_CONFIG: AdaptiveLearningConfig = {
  minMasteryScore: 0.7,
  maxAttemptsBeforeRemediation: 3,
  difficultyAdjustmentThreshold: 0.3,
  targetBloomsProgression: true,
};

/**
 * Adaptive Learning Engine that personalizes learning paths.
 */
export class AdaptiveLearningEngine {
  private provider: AIProvider;
  private config: AdaptiveLearningConfig;

  constructor(provider: AIProvider, config?: Partial<AdaptiveLearningConfig>) {
    this.provider = provider;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate a personalized learning path based on student profile and knowledge graph.
   */
  async generateLearningPath(
    studentProfile: StudentProfile,
    knowledgeGraph: KnowledgeGraph,
    targetObjectives: string[]
  ): Promise<LearningPath> {
    // Determine starting point based on student competency
    const startingNodes = this.identifyStartingNodes(knowledgeGraph, studentProfile);

    // Build path through knowledge graph honoring prerequisites
    const orderedNodes = this.topologicalSort(knowledgeGraph, startingNodes, targetObjectives);

    // Assign difficulty based on student level
    const pathNodes = orderedNodes.map((nodeId, index) => {
      const kgNode = knowledgeGraph.nodes.find((n) => n.id === nodeId);
      return this.createPathNode(kgNode, studentProfile, index, orderedNodes);
    });

    // Generate adaptive rules for the path
    const enrichedNodes = pathNodes.map((node) => ({
      ...node,
      adaptiveRules: this.generateAdaptiveRules(node, studentProfile),
    }));

    // Use AI to generate descriptions and enhance content
    const aiEnhancedPath = await this.enhancePathWithAI(
      enrichedNodes,
      studentProfile,
      targetObjectives
    );

    const now = new Date().toISOString();
    return {
      id: `path_${Date.now()}_${studentProfile.studentId}`,
      studentId: studentProfile.studentId,
      subject: knowledgeGraph.subject,
      title: `Personalized ${knowledgeGraph.subject} Path`,
      description: aiEnhancedPath.description,
      nodes: aiEnhancedPath.nodes,
      currentNodeIndex: 0,
      completionPercentage: 0,
      estimatedTotalMinutes: aiEnhancedPath.nodes.reduce((sum, n) => sum + n.estimatedMinutes, 0),
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Adapt an existing learning path based on new performance data.
   */
  async adaptPath(
    currentPath: LearningPath,
    performance: StudentPerformance,
    studentProfile: StudentProfile
  ): Promise<LearningPath> {
    const updatedNodes = [...currentPath.nodes];
    const nodeIndex = updatedNodes.findIndex((n) => n.id === performance.nodeId);

    if (nodeIndex === -1) {
      return currentPath;
    }

    // Update mastery score
    updatedNodes[nodeIndex] = {
      ...updatedNodes[nodeIndex],
      masteryScore: performance.score,
      status: performance.score >= this.config.minMasteryScore ? "completed" : "in_progress",
    };

    // Apply adaptive rules
    const adaptedNodes = this.applyAdaptiveRules(updatedNodes, nodeIndex, performance);

    // Adjust difficulty for remaining nodes
    const adjustedNodes = this.adjustRemainingDifficulty(adaptedNodes, nodeIndex, performance);

    // Calculate new current node
    const newCurrentIndex = this.findNextAvailableNode(adjustedNodes);

    // Update completion percentage
    const completedCount = adjustedNodes.filter((n) => n.status === "completed").length;
    const completionPercentage = (completedCount / adjustedNodes.length) * 100;

    return {
      ...currentPath,
      nodes: adjustedNodes,
      currentNodeIndex: newCurrentIndex,
      completionPercentage,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate recommended difficulty for a student based on performance history.
   */
  calculateRecommendedDifficulty(studentProfile: StudentProfile): ContentDifficulty {
    const recentPerformance = studentProfile.performanceHistory.slice(-10);

    if (recentPerformance.length === 0) {
      return this.competencyToDifficulty(studentProfile.currentLevel);
    }

    const avgScore =
      recentPerformance.reduce((sum, p) => sum + p.score, 0) / recentPerformance.length;

    if (avgScore >= 0.9) return "advanced" as ContentDifficulty;
    if (avgScore >= 0.75) return "hard" as ContentDifficulty;
    if (avgScore >= 0.5) return "medium" as ContentDifficulty;
    return "easy" as ContentDifficulty;
  }

  /**
   * Determine the next Bloom's taxonomy level a student should target.
   */
  getNextBloomsLevel(
    currentAchieved: BloomsTaxonomyLevel,
    performance: StudentPerformance[]
  ): BloomsTaxonomyLevel {
    const levels: BloomsTaxonomyLevel[] = [
      "remember",
      "understand",
      "apply",
      "analyze",
      "evaluate",
      "create",
    ];

    const currentIndex = levels.indexOf(currentAchieved);
    if (currentIndex === -1 || currentIndex >= levels.length - 1) {
      return currentAchieved;
    }

    // Check if student demonstrates mastery at current level
    const recentAtLevel = performance.filter(
      (p) => p.bloomsLevelAchieved === currentAchieved && p.score >= this.config.minMasteryScore
    );

    // Need at least 3 successful demonstrations to advance
    if (recentAtLevel.length >= 3) {
      return levels[currentIndex + 1];
    }

    return currentAchieved;
  }

  // ==================== Private Methods ====================

  private identifyStartingNodes(
    graph: KnowledgeGraph,
    profile: StudentProfile
  ): string[] {
    // Find nodes with no prerequisites or prerequisites already mastered
    const masteredConcepts = new Set(
      profile.performanceHistory
        .filter((p) => p.score >= this.config.minMasteryScore)
        .map((p) => p.nodeId)
    );

    return graph.nodes
      .filter((node) => {
        const prereqsMet = node.prerequisites.every((p) => masteredConcepts.has(p));
        const notMastered = !masteredConcepts.has(node.id);
        return prereqsMet && notMastered;
      })
      .map((n) => n.id);
  }

  private topologicalSort(
    graph: KnowledgeGraph,
    startingNodes: string[],
    targetObjectives: string[]
  ): string[] {
    // Build adjacency list from edges
    const adjacencyMap = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const node of graph.nodes) {
      adjacencyMap.set(node.id, []);
      inDegree.set(node.id, 0);
    }

    for (const edge of graph.edges) {
      if (edge.relationship === "prerequisite") {
        const targets = adjacencyMap.get(edge.source) || [];
        targets.push(edge.target);
        adjacencyMap.set(edge.source, targets);
        inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
      }
    }

    // Kahn's algorithm with starting nodes as initial queue
    const queue: string[] = [];
    const result: string[] = [];
    const visited = new Set<string>();

    // Start with nodes that have no unmet prerequisites
    for (const nodeId of startingNodes) {
      if (!visited.has(nodeId)) {
        queue.push(nodeId);
        visited.add(nodeId);
      }
    }

    // If no starting nodes, find zero in-degree nodes
    if (queue.length === 0) {
      for (const [nodeId, degree] of inDegree.entries()) {
        if (degree === 0 && !visited.has(nodeId)) {
          queue.push(nodeId);
          visited.add(nodeId);
        }
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const neighbors = adjacencyMap.get(current) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          const newDegree = (inDegree.get(neighbor) || 1) - 1;
          inDegree.set(neighbor, newDegree);
          if (newDegree <= 0) {
            queue.push(neighbor);
            visited.add(neighbor);
          }
        }
      }
    }

    // Filter to only include nodes leading to target objectives
    if (targetObjectives.length > 0) {
      const targetSet = new Set(targetObjectives);
      return result.filter(
        (id) => targetSet.has(id) || this.leadsToTarget(id, adjacencyMap, targetSet)
      );
    }

    return result;
  }

  private leadsToTarget(
    nodeId: string,
    adjacencyMap: Map<string, string[]>,
    targets: Set<string>
  ): boolean {
    const visited = new Set<string>();
    const stack = [nodeId];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (targets.has(current)) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      const neighbors = adjacencyMap.get(current) || [];
      stack.push(...neighbors);
    }

    return false;
  }

  private createPathNode(
    kgNode: KnowledgeGraph["nodes"][0] | undefined,
    profile: StudentProfile,
    index: number,
    allNodes: string[]
  ): LearningPathNode {
    const difficulty = this.calculateRecommendedDifficulty(profile);
    const contentTypes: LearningPathNode["contentType"][] = [
      "lesson",
      "quiz",
      "assignment",
      "project",
      "discussion",
      "video",
      "reading",
    ];

    return {
      id: kgNode?.id || `node_${index}`,
      title: kgNode?.label || `Learning Node ${index + 1}`,
      description: kgNode?.description || "",
      objectiveIds: [kgNode?.id || `obj_${index}`],
      contentType: contentTypes[index % contentTypes.length],
      estimatedMinutes: this.estimateMinutes(difficulty),
      difficulty,
      prerequisites: kgNode?.prerequisites.filter((p) => allNodes.includes(p)) || [],
      status: index === 0 ? "available" : "locked",
      adaptiveRules: [],
    };
  }

  private estimateMinutes(difficulty: ContentDifficulty): number {
    switch (difficulty) {
      case "easy":
        return 15;
      case "medium":
        return 25;
      case "hard":
        return 35;
      case "advanced":
        return 45;
      default:
        return 20;
    }
  }

  private generateAdaptiveRules(
    node: LearningPathNode,
    _profile: StudentProfile
  ): AdaptiveRule[] {
    return [
      {
        id: `rule_${node.id}_low_score`,
        condition: {
          type: "score_below",
          threshold: this.config.minMasteryScore,
          nodeId: node.id,
        },
        action: {
          type: "add_remediation",
          parameters: { difficulty: "easy", contentType: "explanation" },
        },
        priority: 1,
      },
      {
        id: `rule_${node.id}_high_score`,
        condition: {
          type: "score_above",
          threshold: 0.9,
          nodeId: node.id,
        },
        action: {
          type: "adjust_difficulty",
          parameters: { increase: true },
        },
        priority: 2,
      },
      {
        id: `rule_${node.id}_attempts`,
        condition: {
          type: "attempts_exceeded",
          threshold: this.config.maxAttemptsBeforeRemediation,
          nodeId: node.id,
        },
        action: {
          type: "suggest_resource",
          parameters: { type: "video", difficulty: "easy" },
        },
        priority: 3,
      },
    ];
  }

  private async enhancePathWithAI(
    nodes: LearningPathNode[],
    profile: StudentProfile,
    objectives: string[]
  ): Promise<{ description: string; nodes: LearningPathNode[] }> {
    try {
      const response = await this.provider.complete({
        system:
          "You are an adaptive learning path designer. Generate a brief description for a personalized learning path. Respond with valid JSON only.",
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              studentLevel: profile.currentLevel,
              learningStyle: profile.learningStyle,
              nodeCount: nodes.length,
              objectives,
            }),
          },
        ],
      });

      const parsed = JSON.parse(response.content);
      return {
        description: parsed.description || "Personalized learning path",
        nodes,
      };
    } catch {
      // Fallback if AI enhancement fails
      return {
        description: `A personalized learning path with ${nodes.length} activities tailored to your ${profile.currentLevel} level.`,
        nodes,
      };
    }
  }

  private applyAdaptiveRules(
    nodes: LearningPathNode[],
    nodeIndex: number,
    performance: StudentPerformance
  ): LearningPathNode[] {
    const node = nodes[nodeIndex];
    const updatedNodes = [...nodes];

    for (const rule of node.adaptiveRules) {
      if (this.evaluateCondition(rule.condition, performance)) {
        this.executeAction(rule.action, updatedNodes, nodeIndex);
      }
    }

    return updatedNodes;
  }

  private evaluateCondition(
    condition: AdaptiveRule["condition"],
    performance: StudentPerformance
  ): boolean {
    switch (condition.type) {
      case "score_below":
        return performance.score < condition.threshold;
      case "score_above":
        return performance.score > condition.threshold;
      case "attempts_exceeded":
        return performance.attempts > condition.threshold;
      case "time_exceeded":
        return performance.timeSpentMinutes > condition.threshold;
      default:
        return false;
    }
  }

  private executeAction(
    action: AdaptiveRule["action"],
    nodes: LearningPathNode[],
    nodeIndex: number
  ): void {
    switch (action.type) {
      case "adjust_difficulty":
        if (action.parameters.increase && nodeIndex + 1 < nodes.length) {
          const nextDifficulty = this.increaseDifficulty(nodes[nodeIndex + 1].difficulty);
          nodes[nodeIndex + 1] = { ...nodes[nodeIndex + 1], difficulty: nextDifficulty };
        }
        break;
      case "add_remediation":
        // Insert a remediation node after current
        if (nodeIndex + 1 < nodes.length) {
          const remediationNode: LearningPathNode = {
            id: `remediation_${nodes[nodeIndex].id}`,
            title: `Review: ${nodes[nodeIndex].title}`,
            description: "Additional practice to reinforce understanding",
            objectiveIds: nodes[nodeIndex].objectiveIds,
            contentType: "lesson",
            estimatedMinutes: 15,
            difficulty: "easy" as ContentDifficulty,
            prerequisites: [nodes[nodeIndex].id],
            status: "available",
            adaptiveRules: [],
          };
          nodes.splice(nodeIndex + 1, 0, remediationNode);
        }
        break;
      case "skip_node":
        if (nodeIndex + 1 < nodes.length) {
          nodes[nodeIndex + 1] = { ...nodes[nodeIndex + 1], status: "skipped" };
        }
        break;
    }
  }

  private adjustRemainingDifficulty(
    nodes: LearningPathNode[],
    fromIndex: number,
    performance: StudentPerformance
  ): LearningPathNode[] {
    const scoreDiff = performance.score - this.config.minMasteryScore;

    if (Math.abs(scoreDiff) < this.config.difficultyAdjustmentThreshold) {
      return nodes;
    }

    return nodes.map((node, index) => {
      if (index <= fromIndex || node.status === "completed") return node;

      if (scoreDiff > this.config.difficultyAdjustmentThreshold) {
        return { ...node, difficulty: this.increaseDifficulty(node.difficulty) };
      } else if (scoreDiff < -this.config.difficultyAdjustmentThreshold) {
        return { ...node, difficulty: this.decreaseDifficulty(node.difficulty) };
      }

      return node;
    });
  }

  private findNextAvailableNode(nodes: LearningPathNode[]): number {
    const idx = nodes.findIndex(
      (n) => n.status === "available" || n.status === "in_progress"
    );
    return idx >= 0 ? idx : nodes.length - 1;
  }

  private competencyToDifficulty(level: CompetencyLevel): ContentDifficulty {
    switch (level) {
      case "novice":
      case "beginner":
        return "easy" as ContentDifficulty;
      case "intermediate":
        return "medium" as ContentDifficulty;
      case "proficient":
        return "hard" as ContentDifficulty;
      case "advanced":
      case "expert":
        return "advanced" as ContentDifficulty;
      default:
        return "medium" as ContentDifficulty;
    }
  }

  private increaseDifficulty(current: ContentDifficulty): ContentDifficulty {
    const levels: ContentDifficulty[] = ["easy", "medium", "hard", "advanced"];
    const idx = levels.indexOf(current);
    return idx < levels.length - 1 ? levels[idx + 1] : current;
  }

  private decreaseDifficulty(current: ContentDifficulty): ContentDifficulty {
    const levels: ContentDifficulty[] = ["easy", "medium", "hard", "advanced"];
    const idx = levels.indexOf(current);
    return idx > 0 ? levels[idx - 1] : current;
  }
}
