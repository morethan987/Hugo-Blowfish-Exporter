package com.example.procurement.repository;

import com.example.procurement.model.PurchaseRecord;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PurchaseRecordRepository extends JpaRepository<PurchaseRecord, Long> {}
