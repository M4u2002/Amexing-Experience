# Architecture Diagrams - AmexingWeb PCI DSS Compliant System

## Overview

This directory contains comprehensive architecture diagrams for the AmexingWeb PCI DSS Level 1 compliant payment processing system. All diagrams are created using PlantUML and follow PCI DSS 4.0 security requirements for network segmentation, data protection, and access control.

## Architecture Components

### Infrastructure Stack
- **AWS EC2**: Application server hosting
- **Nginx**: Reverse proxy with SSL termination
- **Node.js**: Parse Server application runtime
- **MongoDB Atlas**: PCI DSS compliant database service
- **AWS S3**: Encrypted file storage

### Security Zones (PCI DSS Network Segmentation)
- **Internet Zone**: Public internet (untrusted)
- **DMZ Zone**: Nginx reverse proxy (controlled access)
- **Application Zone**: Parse Server CDE (cardholder data environment)
- **Database Zone**: MongoDB Atlas external CDE
- **Storage Zone**: S3 encrypted storage

## Diagram Categories

### 🏗️ Architecture Diagrams (`/architecture/`)
- ✅ **High-Level System Architecture** (`high-level.puml`): Complete system design with PCI DSS annotations

### 🔐 Security Diagrams (`/security/`)
- ✅ **Network Security Architecture** (`network-security.puml`): Firewall rules, security groups, VPC configuration

### 📊 Data Flow Diagrams (`/data-flow/`)
- ✅ **Cardholder Data Flow** (`cardholder-data.puml`): CHD processing paths with encryption and masking

### 🚀 Deployment Diagrams (`/deployment/`)
- ✅ **AWS Infrastructure Deployment** (`aws-infrastructure.puml`): Complete AWS resource configuration and security controls

## How to View Diagrams

### Online Preview
1. Copy the PlantUML code from any `.puml` file
2. Paste into [PlantUML Online Server](http://www.plantuml.com/plantuml/uml/)
3. View the rendered diagram

### VS Code Extension
1. Install "PlantUML" extension by jebbs
2. Open any `.puml` file
3. Use `Alt+D` to preview the diagram

### Local PlantUML Server
```bash
# Install PlantUML
npm install -g node-plantuml

# Generate diagrams
node-plantuml docs/diagrams/**/*.puml
```

## PCI DSS Compliance Notes

### Network Segmentation (Requirement 1)
All diagrams clearly show:
- Network boundaries between trusted and untrusted zones
- Firewall placement and rules
- Traffic flow restrictions
- Access control points

### Data Protection (Requirements 3 & 4)
Diagrams indicate:
- Encryption points for data at rest and in transit
- Cardholder data handling boundaries
- Secure transmission paths
- Key management points

### Access Control (Requirements 7 & 8)
Visual representation of:
- Authentication checkpoints
- Authorization boundaries
- User access paths
- Administrative access controls

### Monitoring (Requirement 10)
Diagrams show:
- Audit log collection points
- Monitoring system integration
- Log aggregation flows
- Security event paths

## Diagram Standards

### Color Coding
- **Red**: Security boundaries and critical components
- **Blue**: Data flows and communication paths
- **Green**: Trusted/secure zones
- **Orange**: DMZ and controlled access zones
- **Gray**: External services and infrastructure

### Notation
- **Solid lines**: Direct connections
- **Dashed lines**: Logical/indirect connections
- **Bold boxes**: Security-critical components
- **Double lines**: Encrypted communications

### PCI DSS Annotations
Each diagram includes:
- Relevant PCI DSS requirement references
- Security control mappings
- Compliance boundary indicators
- Risk level classifications

## Quick Reference

| Diagram | Purpose | PCI DSS Requirements |
|---------|---------|---------------------|
| `architecture/high-level.puml` | System overview | 1.2.3, 1.2.4, 7.1.1, 10.2.1 |
| `security/network-security.puml` | Network controls | 1.2.1, 1.3.1, 1.4.1, 1.4.4 |
| `data-flow/cardholder-data.puml` | CHD processing | 3.1, 3.4, 3.5, 4.1, 4.2, 10.2.1 |
| `deployment/aws-infrastructure.puml` | Infrastructure | 1.2.1, 2.2.1, 9.1.1, 10.3.1 |

## Maintenance

### Updating Diagrams
1. Modify the `.puml` source file
2. Regenerate the diagram preview
3. Update documentation if architecture changes
4. Review PCI DSS compliance implications

### Version Control
- All diagram source files (`.puml`) are version controlled
- Generated images are not committed to Git
- Changes require security review for compliance impact

---

**Compliance Level**: PCI DSS 4.0 Level 1  
**Last Updated**: August 2025  
**Review Cycle**: Monthly or after architecture changes  
**Owner**: Architecture & Security Team