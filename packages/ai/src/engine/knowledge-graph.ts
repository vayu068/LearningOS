/**
 * Knowledge Graph Management
 *
 * Creates and updates subject-specific knowledge graphs, maps prerequisites,
 * and identifies learning gaps for personalized learning.
 */

import type { AIProvider } from "../providers/base";
import type {
  KnowledgeGraph,
  KnowledgeNode,
  KnowledgeEdge,
  BloomsTaxonomyLevel,
  CompetencyLevel,
  StudentPerformance,
} from "../types";

export interface KnowledgeGraphConfig {
  maxNodesPerSubject: number;
  prerequisiteDepth: number;
  gapThreshold: number;
}

const DEFAULT_KG_CONFIG: KnowledgeGraphConfig = {
  maxNodesPerSubject: 500,
  prerequisiteDepth: 5,
  gapThreshold: 0.6,
};

export interface LearningGap {
  nodeId: string;
  label: string;
  severity: "low" | "medium" | "high" | "critical";
  missingPrerequisites: string[];
  recommendedActions: string[];
}

/**
 * Knowledge Graph service for managing subject-specific knowledge structures.
 */
export class KnowledgeGraphService {
  private provider: AIProvider;
  private config: KnowledgeGraphConfig;

  constructor(provider: AIProvider, config?: Partial<KnowledgeGraphConfig>) {
    this.provider = provider;
    this.config = { ...DEFAULT_KG_CONFIG, ...config };
  }

  /**
   * Create a knowledge graph for a subject from curriculum data.
   */
  async createGraph(
    subject: string,
    topics: string[],
    existingContent?: string
  ): Promise<KnowledgeGraph> {
    const prompt = {
      system:
        'You are a curriculum design expert. Create a knowledge graph for the given subject. Return valid JSON with "nodes" (array of {id, label, description, prerequisites, bloomsLevel, competencyLevel}) and "edges" (array of {source, target, relationship, weight}).',
      messages: [
        {
          role: "user" as const,
          content: JSON.stringify({
            subject,
            topics,
            existingContent: existingContent || null,
            maxNodes: this.config.maxNodesPerSubject,
          }),
        },
      ],
    };

    try {
      const response = await this.provider.complete(prompt);
      const parsed = JSON.parse(response.content);

      return this.buildGraphFromAIResponse(subject, parsed);
    } catch {
      // Fallback: create basic graph from topics
      return this.createBasicGraph(subject, topics);
    }
  }

  /**
   * Add nodes to an existing knowledge graph.
   */
  addNodes(graph: KnowledgeGraph, nodes: KnowledgeNode[]): KnowledgeGraph {
    const existingIds = new Set(graph.nodes.map((n) => n.id));
    const newNodes = nodes.filter((n) => !existingIds.has(n.id));

    return {
      ...graph,
      nodes: [...graph.nodes, ...newNodes],
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Add edges (relationships) between nodes.
   */
  addEdges(graph: KnowledgeGraph, edges: KnowledgeEdge[]): KnowledgeGraph {
    const nodeIds = new Set(graph.nodes.map((n) => n.id));
    const validEdges = edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );

    return {
      ...graph,
      edges: [...graph.edges, ...validEdges],
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get prerequisites for a specific node (transitive).
   */
  getPrerequisites(graph: KnowledgeGraph, nodeId: string, depth?: number): string[] {
    const maxDepth = depth || this.config.prerequisiteDepth;
    const prerequisites: Set<string> = new Set();
    const queue: Array<{ id: string; level: number }> = [{ id: nodeId, level: 0 }];

    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      if (level >= maxDepth) continue;

      const prereqEdges = graph.edges.filter(
        (e) => e.target === id && e.relationship === "prerequisite"
      );

      for (const edge of prereqEdges) {
        if (!prerequisites.has(edge.source)) {
          prerequisites.add(edge.source);
          queue.push({ id: edge.source, level: level + 1 });
        }
      }
    }

    return Array.from(prerequisites);
  }

  /**
   * Identify learning gaps based on student performance.
   */
  identifyGaps(
    graph: KnowledgeGraph,
    performanceData: StudentPerformance[]
  ): LearningGap[] {
    const gaps: LearningGap[] = [];
    const performanceMap = new Map<string, StudentPerformance>();

    for (const perf of performanceData) {
      performanceMap.set(perf.nodeId, perf);
    }

    for (const node of graph.nodes) {
      const performance = performanceMap.get(node.id);

      // Node not attempted yet - check if prerequisites are met
      if (!performance) {
        const prereqs = this.getPrerequisites(graph, node.id, 1);
        const unmetPrereqs = prereqs.filter((p) => {
          const pPerf = performanceMap.get(p);
          return !pPerf || pPerf.score < this.config.gapThreshold;
        });

        if (unmetPrereqs.length > 0) {
          gaps.push({
            nodeId: node.id,
            label: node.label,
            severity: this.calculateGapSeverity(unmetPrereqs.length, prereqs.length),
            missingPrerequisites: unmetPrereqs,
            recommendedActions: [
              `Complete prerequisites: ${unmetPrereqs.join(", ")}`,
              `Review foundational concepts for ${node.label}`,
            ],
          });
        }
        continue;
      }

      // Node attempted but below threshold
      if (performance.score < this.config.gapThreshold) {
        const prereqs = this.getPrerequisites(graph, node.id, 1);
        const weakPrereqs = prereqs.filter((p) => {
          const pPerf = performanceMap.get(p);
          return !pPerf || pPerf.score < this.config.gapThreshold;
        });

        gaps.push({
          nodeId: node.id,
          label: node.label,
          severity:
            performance.score < 0.3
              ? "critical"
              : performance.score < 0.5
                ? "high"
                : "medium",
          missingPrerequisites: weakPrereqs,
          recommendedActions: this.generateGapRecommendations(node, performance, weakPrereqs),
        });
      }
    }

    return gaps.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Get related nodes for a given node.
   */
  getRelatedNodes(graph: KnowledgeGraph, nodeId: string): KnowledgeNode[] {
    const relatedEdges = graph.edges.filter(
      (e) =>
        (e.source === nodeId || e.target === nodeId) &&
        e.relationship === "related"
    );

    const relatedIds = new Set(
      relatedEdges.map((e) => (e.source === nodeId ? e.target : e.source))
    );

    return graph.nodes.filter((n) => relatedIds.has(n.id));
  }

  /**
   * Find the shortest learning path between two nodes.
   */
  findShortestPath(graph: KnowledgeGraph, fromId: string, toId: string): string[] {
    // BFS shortest path
    const queue: Array<{ id: string; path: string[] }> = [{ id: fromId, path: [fromId] }];
    const visited = new Set<string>();
    visited.add(fromId);

    while (queue.length > 0) {
      const { id, path } = queue.shift()!;

      if (id === toId) return path;

      // Find all connected nodes
      const neighbors = graph.edges
        .filter((e) => e.source === id || e.target === id)
        .map((e) => (e.source === id ? e.target : e.source));

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ id: neighbor, path: [...path, neighbor] });
        }
      }
    }

    return []; // No path found
  }

  // ==================== Private Methods ====================

  private buildGraphFromAIResponse(
    subject: string,
    parsed: Record<string, unknown>
  ): KnowledgeGraph {
    const rawNodes = (parsed.nodes || []) as Array<Record<string, unknown>>;
    const rawEdges = (parsed.edges || []) as Array<Record<string, unknown>>;

    const nodes: KnowledgeNode[] = rawNodes.map((n, i) => ({
      id: (n.id as string) || `node_${i}`,
      label: (n.label as string) || `Topic ${i + 1}`,
      subject,
      topic: (n.topic as string) || subject,
      description: (n.description as string) || "",
      bloomsLevel: (n.bloomsLevel as BloomsTaxonomyLevel) || "understand",
      competencyLevel: (n.competencyLevel as CompetencyLevel) || "intermediate",
      prerequisites: (n.prerequisites as string[]) || [],
      relatedNodes: (n.relatedNodes as string[]) || [],
    }));

    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges: KnowledgeEdge[] = rawEdges
      .filter((e) => nodeIds.has(e.source as string) && nodeIds.has(e.target as string))
      .map((e) => ({
        source: e.source as string,
        target: e.target as string,
        relationship: (e.relationship as KnowledgeEdge["relationship"]) || "prerequisite",
        weight: (e.weight as number) || 1,
      }));

    return {
      id: `kg_${subject}_${Date.now()}`,
      subject,
      nodes,
      edges,
      version: "1.0",
      updatedAt: new Date().toISOString(),
    };
  }

  private createBasicGraph(subject: string, topics: string[]): KnowledgeGraph {
    const nodes: KnowledgeNode[] = topics.map((topic, i) => ({
      id: `${subject}_${i}`,
      label: topic,
      subject,
      topic,
      description: `Fundamental concepts of ${topic}`,
      bloomsLevel: "understand" as BloomsTaxonomyLevel,
      competencyLevel: "intermediate" as CompetencyLevel,
      prerequisites: i > 0 ? [`${subject}_${i - 1}`] : [],
      relatedNodes: [],
    }));

    const edges: KnowledgeEdge[] = [];
    for (let i = 1; i < nodes.length; i++) {
      edges.push({
        source: nodes[i - 1].id,
        target: nodes[i].id,
        relationship: "prerequisite",
        weight: 1,
      });
    }

    return {
      id: `kg_${subject}_${Date.now()}`,
      subject,
      nodes,
      edges,
      version: "1.0",
      updatedAt: new Date().toISOString(),
    };
  }

  private calculateGapSeverity(
    unmetCount: number,
    totalPrereqs: number
  ): LearningGap["severity"] {
    const ratio = totalPrereqs > 0 ? unmetCount / totalPrereqs : 0;
    if (ratio >= 0.75) return "critical";
    if (ratio >= 0.5) return "high";
    if (ratio >= 0.25) return "medium";
    return "low";
  }

  private generateGapRecommendations(
    node: KnowledgeNode,
    performance: StudentPerformance,
    weakPrereqs: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (weakPrereqs.length > 0) {
      recommendations.push(`Review prerequisites: ${weakPrereqs.join(", ")}`);
    }

    if (performance.attempts > 2) {
      recommendations.push(`Try a different learning approach for ${node.label}`);
    }

    if (performance.score < 0.3) {
      recommendations.push(`Start with basic concepts before attempting ${node.label}`);
      recommendations.push("Consider one-on-one tutoring support");
    } else {
      recommendations.push(`Practice more exercises on ${node.label}`);
    }

    return recommendations;
  }
}
