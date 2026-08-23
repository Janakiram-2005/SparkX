CREATE DATABASE IF NOT EXISTS aisparkx_db;
USE aisparkx_db;

-- Table to store team information and progress
CREATE TABLE IF NOT EXISTS teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_name VARCHAR(255) NOT NULL,
    ai_id VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    score INT DEFAULT 0,
    jigsaw_progress INT DEFAULT 0,
    status ENUM('waiting', 'started', 'completed') DEFAULT 'waiting',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to store post-exam feedback
CREATE TABLE IF NOT EXISTS feedbacks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    improvements_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Table to manage global system state (e.g. is round 1 active)
CREATE TABLE IF NOT EXISTS system_state (
    id INT PRIMARY KEY,
    round1_active BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Initialize system state if empty
INSERT IGNORE INTO system_state (id, round1_active) VALUES (1, FALSE);
