package com.fileease;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface PresetRepo extends MongoRepository<Models.Preset,String> {
    List<Models.Preset>findByUserId(String userId);
    long countByUserId(String userId);
}
