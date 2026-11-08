package com.fileease;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserRepo extends MongoRepository<Models.User,String> {
    Optional<Models.User>findByEmail(String email);
}
