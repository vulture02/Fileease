package com.fileease;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface PaymentRepo extends MongoRepository<Models.Payment,String> {
    List<Models.Payment> findByUserId(String userId);
    List<Models.Payment> findByStatus(String status);
    boolean existsByTxnId(String txnId);
}
