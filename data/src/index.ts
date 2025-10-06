/**
 * Synthetic Data Generator
 * Generates realistic test data for the agenda manager application
 */

import { faker } from '@faker-js/faker';
import * as fs from 'fs';
import * as path from 'path';
import {
  MeetingRequest,
  Host,
  HostAvailability,
  RequestStatus,
  MeetingType,
  Priority,
  CompanyTier
} from '@agenda-manager/shared';

const OUTPUT_DIR = path.join(__dirname, '../output');
const NUM_REQUESTS = 120;
const NUM_HOSTS = 15;
const EVENT_DATES = generateEventDates(5); // 5 days event

interface GeneratorConfig {
  numRequests: number;
  numHosts: number;
  eventDates: string[];
}

function generateEventDates(days: number): string[] {
  const dates: string[] = [];
  const startDate = new Date('2025-11-15'); // Future event date
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  return dates;
}

function randomEnum<T>(enumObj: T): T[keyof T] {
  const values = Object.values(enumObj as object);
  return values[Math.floor(Math.random() * values.length)] as T[keyof T];
}

function generateCompanyName(): string {
  const companies = [
    'TechCorp Industries', 'Global Innovations Ltd', 'Quantum Dynamics Inc',
    'AI Solutions Group', 'Future Systems AG', 'Digital Horizons SA',
    'Smart Technologies LLC', 'NextGen Enterprises', 'Innovation Partners',
    'Strategic Ventures Corp', 'Advanced Computing Ltd', 'Data Intelligence Inc',
    'Cloud Systems Group', 'Cyber Security Solutions', 'Blockchain Ventures',
    'Robotics International', 'Biotech Innovations', 'Energy Solutions Ltd',
    'Sustainability Partners', 'Green Tech Corp', 'Smart City Solutions',
    'Healthcare Technologies', 'Financial Services Group', 'E-Commerce Global',
    'Media Networks Inc', 'Entertainment Systems', 'Gaming Technologies',
    'Education Platforms Ltd', 'Research Institute AG', 'Consulting Partners'
  ];
  
  return faker.helpers.arrayElement(companies);
}

function generateTopics(meetingType: MeetingType): string[] {
  const topicsByType: Record<MeetingType, string[]> = {
    [MeetingType.STRATEGIC]: [
      'Long-term partnership opportunities',
      'Market expansion strategies',
      'Digital transformation roadmap',
      'Innovation collaboration',
      'Strategic alignment discussions'
    ],
    [MeetingType.OPERATIONAL]: [
      'Process optimization',
      'Operational efficiency improvements',
      'Resource allocation',
      'Team collaboration',
      'Workflow automation'
    ],
    [MeetingType.SALES]: [
      'Product demonstration',
      'Pricing discussion',
      'Contract negotiation',
      'Customer success stories',
      'Sales pipeline review'
    ],
    [MeetingType.PARTNERSHIP]: [
      'Joint venture opportunities',
      'Co-development initiatives',
      'Channel partnership',
      'Integration opportunities',
      'Ecosystem collaboration'
    ],
    [MeetingType.TECHNICAL]: [
      'Technical architecture review',
      'API integration discussion',
      'Security and compliance',
      'Performance optimization',
      'Infrastructure planning'
    ],
    [MeetingType.KEYNOTE]: [
      'Industry trends presentation',
      'Thought leadership session',
      'Innovation showcase',
      'Future vision discussion',
      'Best practices sharing'
    ],
    [MeetingType.DEMO]: [
      'Product demonstration',
      'Proof of concept presentation',
      'Use case walkthrough',
      'Feature showcase',
      'Live system demo'
    ],
    [MeetingType.OTHER]: [
      'General discussion',
      'Information exchange',
      'Networking opportunity',
      'Industry insights',
      'Market research'
    ]
  };
  
  const topics = topicsByType[meetingType];
  const numTopics = faker.number.int({ min: 1, max: 3 });
  return faker.helpers.arrayElements(topics, numTopics);
}

function generateMeetingRequest(index: number): MeetingRequest {
  const meetingType = randomEnum(MeetingType);
  const companyTier = randomEnum(CompanyTier);
  const urgency = randomEnum(Priority);
  
  // Generate more pending requests for realistic workflow
  let status = RequestStatus.PENDING;
  const statusRoll = Math.random();
  if (statusRoll > 0.7) {
    status = RequestStatus.QUALIFIED;
  } else if (statusRoll > 0.9) {
    status = RequestStatus.SCHEDULED;
  } else if (statusRoll > 0.95) {
    status = RequestStatus.REJECTED;
  }
  
  const submittedDate = faker.date.recent({ days: 30 });
  
  const preferredDates = faker.helpers.arrayElements(EVENT_DATES, 
    faker.number.int({ min: 1, max: 3 })
  );
  
  return {
    id: `req_${index.toString().padStart(4, '0')}`,
    companyName: generateCompanyName(),
    companyTier,
    contactName: faker.person.fullName(),
    contactEmail: faker.internet.email(),
    contactPhone: faker.helpers.maybe(() => faker.phone.number(), { probability: 0.7 }),
    meetingType,
    requestedTopics: generateTopics(meetingType),
    preferredDates,
    urgency,
    status,
    importanceScore: status !== RequestStatus.PENDING 
      ? faker.number.int({ min: 30, max: 100 })
      : undefined,
    qualificationReason: status !== RequestStatus.PENDING
      ? faker.lorem.sentence()
      : undefined,
    fraudScore: faker.number.float({ min: 0, max: 0.3, precision: 0.01 }),
    isDuplicate: faker.helpers.maybe(() => true, { probability: 0.05 }) || false,
    metadata: {
      source: faker.helpers.arrayElement(['web', 'email', 'api', 'crm']),
      referredBy: faker.helpers.maybe(() => faker.person.fullName(), { probability: 0.3 })
    },
    submittedAt: submittedDate,
    qualifiedAt: status !== RequestStatus.PENDING
      ? new Date(submittedDate.getTime() + 3600000) // 1 hour after submission
      : undefined,
    scheduledAt: status === RequestStatus.SCHEDULED
      ? new Date(submittedDate.getTime() + 7200000) // 2 hours after submission
      : undefined,
    updatedAt: new Date()
  };
}

function generateHostAvailability(date: string): HostAvailability {
  const isBlocked = Math.random() > 0.85; // 15% chance of blocked day
  
  if (isBlocked) {
    return {
      date,
      timeSlots: [],
      isBlocked: true,
      blockReason: faker.helpers.arrayElement([
        'Conference attendance',
        'Off-site meeting',
        'Personal time off',
        'Company event'
      ])
    };
  }
  
  // Generate 2-4 available time slots per day
  const numSlots = faker.number.int({ min: 2, max: 4 });
  const timeSlots = [];
  
  const possibleStarts = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
  const selectedStarts = faker.helpers.arrayElements(possibleStarts, numSlots);
  
  for (const start of selectedStarts) {
    const [hours, minutes] = start.split(':').map(Number);
    const endHours = hours + 1;
    const end = `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    timeSlots.push({
      date,
      startTime: start,
      endTime: end
    });
  }
  
  return {
    date,
    timeSlots
  };
}

function generateHost(index: number): Host {
  const departments = ['Executive', 'Sales', 'Engineering', 'Product', 'Marketing', 'Strategy'];
  const roles = ['Director', 'VP', 'Senior Manager', 'Lead', 'Principal'];
  
  const department = faker.helpers.arrayElement(departments);
  const role = faker.helpers.arrayElement(roles);
  
  const expertiseAreas = [
    'Artificial Intelligence', 'Quantum Computing', 'Cloud Architecture',
    'Cybersecurity', 'Data Science', 'Product Strategy', 'Business Development',
    'Digital Transformation', 'Innovation Management', 'Technology Consulting'
  ];
  
  const preferredTypes = faker.helpers.arrayElements(
    Object.values(MeetingType),
    faker.number.int({ min: 2, max: 4 })
  );
  
  return {
    id: `host_${index.toString().padStart(3, '0')}`,
    name: faker.person.fullName(),
    email: faker.internet.email(),
    role: `${role} of ${department}`,
    department,
    expertise: faker.helpers.arrayElements(expertiseAreas, 
      faker.number.int({ min: 2, max: 4 })
    ),
    availability: EVENT_DATES.map(date => generateHostAvailability(date)),
    maxMeetingsPerDay: faker.number.int({ min: 4, max: 8 }),
    preferredMeetingTypes: preferredTypes,
    isActive: faker.helpers.maybe(() => false, { probability: 0.1 }) || true,
    metadata: {
      seniority: faker.helpers.arrayElement(['senior', 'mid', 'junior']),
      timezone: 'UTC+01:00'
    }
  };
}

function generateDataset(config: GeneratorConfig): { 
  requests: MeetingRequest[], 
  hosts: Host[] 
} {
  console.log('🎲 Generating synthetic data...');
  console.log(`   - Requests: ${config.numRequests}`);
  console.log(`   - Hosts: ${config.numHosts}`);
  console.log(`   - Event dates: ${config.eventDates.join(', ')}`);
  
  const requests: MeetingRequest[] = [];
  for (let i = 1; i <= config.numRequests; i++) {
    requests.push(generateMeetingRequest(i));
  }
  
  const hosts: Host[] = [];
  for (let i = 1; i <= config.numHosts; i++) {
    hosts.push(generateHost(i));
  }
  
  return { requests, hosts };
}

function saveToFile(filename: string, data: any): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`✅ Saved: ${filepath}`);
}

function generateStatistics(requests: MeetingRequest[], hosts: Host[]): any {
  const statusCounts = requests.reduce((acc, req) => {
    acc[req.status] = (acc[req.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const typeCounts = requests.reduce((acc, req) => {
    acc[req.meetingType] = (acc[req.meetingType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const tierCounts = requests.reduce((acc, req) => {
    acc[req.companyTier] = (acc[req.companyTier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const qualifiedRequests = requests.filter(r => r.importanceScore !== undefined);
  const avgImportanceScore = qualifiedRequests.length > 0
    ? qualifiedRequests.reduce((sum, r) => sum + (r.importanceScore || 0), 0) / qualifiedRequests.length
    : 0;
  
  const totalAvailableSlots = hosts.reduce((total, host) => {
    return total + host.availability.reduce((hostTotal: number, av) => {
      return hostTotal + av.timeSlots.length;
    }, 0);
  }, 0);
  
  return {
    requests: {
      total: requests.length,
      byStatus: statusCounts,
      byType: typeCounts,
      byTier: tierCounts,
      avgImportanceScore: Math.round(avgImportanceScore * 10) / 10,
      duplicates: requests.filter(r => r.isDuplicate).length
    },
    hosts: {
      total: hosts.length,
      active: hosts.filter(h => h.isActive).length,
      totalAvailableSlots
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      eventDates: EVENT_DATES
    }
  };
}

// Main execution
console.log('🚀 Agenda Manager - Synthetic Data Generator\n');

const config: GeneratorConfig = {
  numRequests: NUM_REQUESTS,
  numHosts: NUM_HOSTS,
  eventDates: EVENT_DATES
};

const { requests, hosts } = generateDataset(config);
const statistics = generateStatistics(requests, hosts);

saveToFile('requests.json', requests);
saveToFile('hosts.json', hosts);
saveToFile('statistics.json', statistics);

console.log('\n📊 Generation Statistics:');
console.log(JSON.stringify(statistics, null, 2));
console.log('\n✨ Data generation complete!');
